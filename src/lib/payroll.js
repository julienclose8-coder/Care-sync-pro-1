import { formatCurrency } from "@/lib/format";

export const OVERTIME_THRESHOLD = 10;

const toMin = (t) => {
  const [h, m] = (t || "00:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

// weekend rate applies by the shift's calendar date; 0 falls back to the base rate
const dayRate = (shift, rates) => {
  const day = new Date(`${shift.date}T00:00:00`).getDay();
  if (day === 6 && rates.saturday_rate > 0) return { rate: rates.saturday_rate, label: "Sat" };
  if (day === 0 && rates.sunday_rate > 0) return { rate: rates.sunday_rate, label: "Sun" };
  return { rate: rates.hourly_pay_rate || 0, label: "" };
};

// minutes of the worked window that fall inside the sleep window (window may cross midnight)
export const sleepMinutes = (start, end, sleepStart, sleepEnd) => {
  if (!sleepStart || !sleepEnd) return 0;
  let ws = toMin(start);
  let we = toMin(end);
  if (we <= ws) we += 1440;
  let ss = toMin(sleepStart);
  let se = toMin(sleepEnd);
  if (se <= ss) se += 1440;
  const overlap = (s, e) => Math.max(0, Math.min(we, e) - Math.max(ws, s));
  return Math.max(overlap(ss, se), overlap(ss - 1440, se - 1440), overlap(ss + 1440, se + 1440));
};

// pay for one completed shift with recorded times
export const shiftPay = (shift, rates = {}) => {
  const start = shift.clock_in || shift.start_time;
  const end = shift.clock_out || shift.end_time;
  let we = toMin(end);
  const ws = toMin(start);
  if (we <= ws) we += 1440;
  const totalHours = Math.round(((we - ws) / 60) * 100) / 100;
  const { rate, label } = dayRate(shift, rates);
  const lines = [];
  let pay = 0;

  if (shift.is_sleepover && shift.sleep_start && shift.sleep_end) {
    const asleep = Math.round((sleepMinutes(start, end, shift.sleep_start, shift.sleep_end) / 60) * 100) / 100;
    const awake = Math.max(0, Math.round((totalHours - asleep) * 100) / 100);
    pay += awake * rate;
    lines.push({ label: `${awake} hrs awake${label ? ` (${label} rate)` : ""}`, amount: awake * rate });
    pay += rates.sleepover_flat_rate || 0;
    lines.push({ label: "Sleepover flat rate", amount: rates.sleepover_flat_rate || 0 });
  } else {
    const normal = Math.min(totalHours, OVERTIME_THRESHOLD);
    pay += normal * rate;
    lines.push({ label: `${normal} hrs${label ? ` (${label} rate)` : ""}`, amount: normal * rate });
    if (totalHours > OVERTIME_THRESHOLD) {
      const ot = Math.round((totalHours - OVERTIME_THRESHOLD) * 100) / 100;
      const otRate = rates.overtime_rate > 0 ? rates.overtime_rate : rate * 1.5;
      pay += ot * otRate;
      lines.push({ label: `${ot} hrs overtime @ ${formatCurrency(otRate)}/hr`, amount: ot * otRate });
    }
  }
  return { hours: totalHours, pay: Math.round(pay * 100) / 100, lines };
};

// totals for a set of completed, fully clocked shifts
export const payRun = (shifts, rates = {}) => {
  const unpaid = (shifts || []).filter((s) => s.status === "completed" && s.clock_in && s.clock_out);
  const dates = unpaid.map((s) => s.date).sort();
  let hours = 0;
  let pay = 0;
  let weekendShifts = 0;
  let sleepovers = 0;
  let overtimeHours = 0;
  unpaid.forEach((s) => {
    const sp = shiftPay(s, rates);
    hours += sp.hours;
    pay += sp.pay;
    const day = new Date(`${s.date}T00:00:00`).getDay();
    if ((day === 6 && rates.saturday_rate > 0) || (day === 0 && rates.sunday_rate > 0)) weekendShifts += 1;
    if (s.is_sleepover && s.sleep_start && s.sleep_end) sleepovers += 1;
    if (!s.is_sleepover && sp.hours > OVERTIME_THRESHOLD) {
      overtimeHours += Math.round((sp.hours - OVERTIME_THRESHOLD) * 100) / 100;
    }
  });
  const parts = [];
  if (weekendShifts) parts.push(`${weekendShifts} weekend-rate shift${weekendShifts > 1 ? "s" : ""}`);
  if (sleepovers) parts.push(`${sleepovers} sleepover${sleepovers > 1 ? "s" : ""}`);
  if (overtimeHours) parts.push(`${overtimeHours} OT hrs`);
  return {
    hours: Math.round(hours * 100) / 100,
    pay: Math.round(pay * 100) / 100,
    from: dates[0] || "",
    to: dates[dates.length - 1] || "",
    breakdown: parts.join(" · "),
  };
};