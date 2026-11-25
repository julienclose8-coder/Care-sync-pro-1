export const TRAININGS = [
  "Medication Training",
  "Personal Care (PC) Training",
  "Manual Handling",
  "First Aid",
  "Behaviour Support Training",
];

export function hasAllTrainings(worker, required = []) {
  return (required || []).every((t) => (worker?.trainings || []).includes(t));
}

export function approvedTeamIds(team = [], clientId) {
  return (team || [])
    .filter((m) => m.client_id === clientId && m.status === "approved")
    .map((m) => m.worker_id);
}