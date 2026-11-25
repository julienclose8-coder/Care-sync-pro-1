import { shiftHours } from "@/lib/format";

export function getClientCharges(clients, shifts, invoices) {
  const billed = new Set((invoices || []).flatMap((invoice) => invoice.shift_ids || []));
  return (clients || []).flatMap((client) => {
    const unbilled = (shifts || []).filter((shift) =>
      shift.client_id === client.id && shift.status === "completed" && shift.clock_in && shift.clock_out && !billed.has(shift.id)
    );
    const groups = unbilled.reduce((all, shift) => {
      const name = shift.service_type || "Support";
      if (!all[name]) all[name] = [];
      all[name].push(shift);
      return all;
    }, {});
    return Object.entries(groups).map(([supportName, supports]) => {
      const configuredRate = (client.support_rates || []).find((rate) => rate.name.toLowerCase() === supportName.toLowerCase());
      const hours = supports.reduce((total, shift) => total + shiftHours(shift.clock_in, shift.clock_out), 0);
      const workers = [...new Set(supports.map((shift) => shift.worker_name).filter(Boolean))];
      const workerIds = [...new Set(supports.map((shift) => shift.worker_id).filter(Boolean))];
      const dates = supports.map((shift) => shift.date).sort();
      return { client, supportName, supports, rate: configuredRate?.hourly_rate || client.hourly_charge_rate || 0, hours: Math.round(hours * 100) / 100, workers, workerIds, from: dates[0], to: dates.at(-1) };
    });
  });
}