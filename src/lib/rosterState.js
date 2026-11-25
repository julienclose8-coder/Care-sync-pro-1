export function rosterLocked(date) {
  if (!date) return false;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const cutoff = new Date(`${today}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() + 7);
  return date <= cutoff.toISOString().slice(0, 10);
}

export function rosterState(shift) {
  const closed = shift.status !== 'scheduled' || !!shift.clock_in || !!shift.clock_out;
  const frozen = rosterLocked(shift.date);
  const pending = shift.acknowledgement_status === 'pending';
  const needsReplacement = !!shift.needs_replacement && !closed;
  const label = closed ? (shift.clock_in && shift.status === 'scheduled' ? 'In progress' : shift.status) : needsReplacement ? 'Needs replacement' : !shift.worker_id ? (frozen ? 'Locked · needs worker' : 'Needs worker') : pending ? 'Awaiting acknowledgement' : frozen ? (shift.acknowledgement_status === 'acknowledged' ? 'Locked · acknowledged' : 'Locked · assigned') : 'Ready';
  const colour = closed ? 'border-border bg-muted' : needsReplacement ? 'border-destructive bg-destructive/5' : !shift.worker_id ? (frozen ? 'border-destructive bg-muted' : 'border-destructive bg-destructive/5') : frozen || pending ? 'border-border bg-muted' : 'border-roster-ready bg-roster-ready/10';
  return { closed, frozen, pending, needsReplacement, label, colour };
}