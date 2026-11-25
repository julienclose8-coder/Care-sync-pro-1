export const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount || 0);

export const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr);
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
};

export const todayStr = () => new Date().toISOString().slice(0, 10);

export const formatTime = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
};

export const shiftHours = (start, end) => {
  const toMin = (t) => {
    const [h, m] = (t || "00:00").split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  let diff = toMin(end) - toMin(start);
  if (diff < 0) diff += 24 * 60;
  return Math.round((diff / 60) * 100) / 100;
};

// actual worked hours: prefer clocked times, fall back to scheduled times
export const workedHours = (shift) =>
  shiftHours(shift?.clock_in || shift?.start_time, shift?.clock_out || shift?.end_time);

export const nowTime = () => new Date().toTimeString().slice(0, 5);

export const WEEKDAYS = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
];

export const availabilitySummary = (avail) => {
  if (!avail || avail.length === 0) return "Not set";
  return avail
    .map((a) => {
      const short = a.day.charAt(0).toUpperCase() + a.day.slice(1, 3);
      return `${short} ${formatTime(a.start)}–${formatTime(a.end)}`;
    })
    .join(", ");
};