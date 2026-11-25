import { approvedLeave, workerOnLeave } from './workerLeave.ts';

const dayMs = 86400000;
export const iso = value => new Date(value).toISOString().slice(0, 10);
export const rosterError = (message, status = 400) => Object.assign(new Error(message), { status });
export const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && iso(`${value}T00:00:00Z`) === value;
export function rosterLocked(date) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return !!date && date <= iso(Date.parse(`${today}T00:00:00Z`) + 7 * dayMs);
}
export function interval(shift) {
  const start = Date.parse(`${shift.date}T${shift.start_time}:00Z`);
  let end = Date.parse(`${shift.date}T${shift.end_time}:00Z`);
  if (end < start) end += dayMs;
  return { start, end, hours: Math.round((end - start) / 36000) / 100 };
}
export async function rosterWorker(entities, id) {
  const profiles = await entities.Worker.filter({ id }, { limit: 1, fields: ['full_name', 'email', 'trainings', 'weekly_hour_limit', 'hour_limit_action'] });
  return profiles.items[0] || (await entities.User.filter({ id }))[0];
}
export async function validateRosterShift(entities, shift, shiftId = '') {
  const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  if (typeof shift.client_id !== 'string' || !shift.client_id.trim()) throw rosterError('Choose a client before creating a shift.');
  if (!validDate(shift.date) || !validTime(shift.start_time) || !validTime(shift.end_time) || shift.start_time === shift.end_time) throw rosterError('Choose a valid day and different start and end times.');
  const client = await entities.Client.get(shift.client_id);
  if (!client) throw rosterError('This client no longer exists.', 404);
  if (!['in_home', 'centre_based'].includes(shift.support_setting)) throw rosterError('Choose a support setting.');
  if (shift.support_setting === 'centre_based' && !shift.centre_name?.trim()) throw rosterError('Enter the centre name.');
  if (!['scheduled', 'completed', 'cancelled'].includes(shift.status || 'scheduled')) throw rosterError('Choose a valid status.');
  if (!shift.worker_id) return { worker: null, warning: '' };
  const worker = await rosterWorker(entities, shift.worker_id);
  if (!worker || worker.role === 'admin') throw rosterError('Choose an eligible support worker.');
  if (shift.status === 'cancelled' || shift.status === 'completed') return { worker, warning: '' };
  const times = interval(shift), monday = new Date(`${shift.date}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  const [approved, conflicts, week] = await Promise.all([
    entities.SupportTeamMember.count({ client_id: shift.client_id, worker_id: shift.worker_id, status: 'approved' }),
    entities.Shift.filter({ worker_id: shift.worker_id, id: { $ne: shiftId }, status: { $ne: 'cancelled' }, date: { $gte: iso(times.start - dayMs), $lte: iso(times.start + dayMs) } }, { limit: 500, fields: ['date', 'start_time', 'end_time'] }),
    entities.Shift.filter({ worker_id: shift.worker_id, id: { $ne: shiftId }, status: { $ne: 'cancelled' }, date: { $gte: iso(monday), $lte: iso(monday.getTime() + 6 * dayMs) } }, { limit: 500, fields: ['date', 'start_time', 'end_time'] })
  ]);
  const leave = await approvedLeave(entities, iso(times.start), iso(times.end), shift.worker_id);
  if (workerOnLeave(leave, shift.worker_id, times)) throw rosterError('This worker has approved leave or unavailability during this shift. Choose another worker or time.', 409);
  if (!approved || !(client.training_requirements || []).every(training => (worker.trainings || []).includes(training))) throw rosterError('This worker must be approved on the client’s support team and have all required training.', 409);
  if (conflicts.has_more || week.has_more) throw rosterError('There are too many shifts to safely validate this change.', 409);
  if (conflicts.items.some(other => { const time = interval(other); return times.start < time.end && times.end > time.start; })) throw rosterError('This worker already has an overlapping shift, including overnight shifts. Choose another worker or day.', 409);
  const hours = week.items.reduce((total, item) => total + interval(item).hours, times.hours), limit = Number(worker.weekly_hour_limit ?? 38);
  if (hours > limit && worker.hour_limit_action === 'block') throw rosterError(`This change exceeds the worker’s ${limit}-hour weekly limit.`, 409);
  return { worker, warning: hours > limit ? `Weekly hours are ${hours.toFixed(2)} of ${limit}; this worker’s profile permits a warning.` : '' };
}
const tracked = ['client_id', 'worker_id', 'date', 'start_time', 'end_time', 'status', 'service_type', 'support_setting', 'centre_name', 'centre_address', 'is_sleepover', 'sleep_start', 'sleep_end', 'notes'];
const summary = shift => shift ? `${shift.date} · ${shift.start_time}–${shift.end_time} · ${shift.service_type || 'Support'}${shift.status === 'cancelled' ? ' · cancelled' : ''}` : '';
export async function saveRosterChange(entities, previous, payload, user, worker = null) {
  const next = { ...previous, ...payload };
  const changed = !previous || tracked.some(key => String(previous[key] ?? '') !== String(next[key] ?? ''));
  const needsRequest = changed && next.status !== 'completed' && (rosterLocked(next.date) || rosterLocked(previous?.date));
  const revision = changed ? crypto.randomUUID() : previous.roster_revision || '';
  const recipients = [];
  if (needsRequest && next.worker_id && next.status === 'scheduled') recipients.push({ id: next.worker_id, worker: worker || await rosterWorker(entities, next.worker_id), type: !previous || previous.worker_id !== next.worker_id ? 'assignment' : 'change', snapshot: next });
  if (needsRequest && previous?.worker_id && (previous.worker_id !== next.worker_id || next.status === 'cancelled')) recipients.push({ id: previous.worker_id, worker: await rosterWorker(entities, previous.worker_id), type: 'removal', snapshot: previous });
  for (const recipient of recipients) if (!recipient.worker?.email) throw rosterError('Add the worker’s login email to their profile before changing a locked shift, so they can receive and acknowledge the request.', 409);
  const requestData = await Promise.all(recipients.map(async recipient => ({ revision, worker_id: recipient.id, worker_email: recipient.worker.email.trim().toLowerCase(), change_type: recipient.type, client_name: (await entities.Client.get(recipient.snapshot.client_id)).full_name, previous_summary: summary(previous), current_summary: recipient.type === 'removal' ? 'You are no longer assigned to this shift.' : summary(next), shift_date: recipient.snapshot.date, status: 'pending', requested_by: user.id })));
  const reassigned = previous && previous.worker_id && next.worker_id && previous.worker_id !== next.worker_id;
  const clearReplacement = reassigned && previous.needs_replacement ? { needs_replacement: false, replacement_reason: '' } : {};
  const metadata = changed ? { roster_revision: revision, acknowledgement_status: recipients.some(r => r.id === next.worker_id && r.type !== 'removal') ? 'pending' : 'not_required', acknowledged_at: '', acknowledged_by: '', ...clearReplacement } : {};
  const saved = previous ? await entities.Shift.update(previous.id, { ...payload, ...metadata }) : await entities.Shift.create({ ...payload, ...metadata });
  const created = [];
  try {
    for (const request of requestData) created.push(await entities.RosterAcknowledgement.create({ ...request, shift_id: saved.id }));
    if (changed && previous) await entities.RosterAcknowledgement.updateMany({ $and: [{ shift_id: saved.id, status: 'pending', revision: { $ne: revision } }, { $or: [{ change_type: { $ne: 'removal' } }, { worker_id: { $in: recipients.map(recipient => recipient.id) } }] }] }, { $set: { status: 'superseded' } });
  } catch (error) {
    for (const request of created) await entities.RosterAcknowledgement.delete(request.id);
    if (!previous) await entities.Shift.delete(saved.id);
    else {
      const restore = Object.fromEntries(Object.keys(payload).map(key => [key, previous[key] ?? (key === 'goal_ids' ? [] : key === 'is_sleepover' ? false : '')]));
      await entities.Shift.update(previous.id, { ...restore, roster_revision: previous.roster_revision || '', acknowledgement_status: previous.acknowledgement_status || 'not_required', acknowledged_at: previous.acknowledged_at || '', acknowledged_by: previous.acknowledged_by || '' });
    }
    throw error;
  }
  if (changed) {
    const changes = shiftDiff(previous, next);
    const reassignedNow = previous && previous.worker_id && next.worker_id && previous.worker_id !== next.worker_id;
    const movedNow = previous && previous.date !== next.date;
    const cancelledNow = previous && previous.status !== 'cancelled' && next.status === 'cancelled';
    const action = !previous ? 'created' : cancelledNow ? 'cancelled' : reassignedNow ? 'reassigned' : movedNow ? 'moved' : 'updated';
    const detail = !previous ? 'Shift created'
      : cancelledNow ? 'Shift cancelled'
      : reassignedNow ? `Worker reassigned${previous.worker_name ? ` from ${previous.worker_name}` : ''}${next.worker_name ? ` to ${next.worker_name}` : ''}`
      : movedNow ? `Moved to ${next.date}`
      : `${changes.length} field${changes.length === 1 ? '' : 's'} updated`;
    await recordShiftHistory(entities, saved.id, action, user, detail, changes, { shift_date: saved.date, client_id: saved.client_id, locked: rosterLocked(next.date) || rosterLocked(previous?.date) });
  }
  return { shift: saved, requests: created };
}

const FIELD_LABELS = { client_id: 'Client', worker_id: 'Worker', date: 'Date', start_time: 'Start time', end_time: 'End time', status: 'Status', service_type: 'Service type', support_setting: 'Support setting', centre_name: 'Centre', centre_address: 'Centre address', is_sleepover: 'Sleepover', sleep_start: 'Sleep start', sleep_end: 'Sleep end', notes: 'Notes' };
const displayValue = (shift, key) => {
  if (key === 'worker_id') return shift.worker_name || (shift.worker_id ? shift.worker_id : 'Unassigned');
  if (key === 'is_sleepover') return shift.is_sleepover ? 'Yes' : 'No';
  if (shift[key] === '' || shift[key] == null) return '—';
  return String(shift[key]);
};
function shiftDiff(previous, next) {
  if (!previous) return tracked.filter(k => next[k] !== undefined && next[k] !== '' && !(k === 'is_sleepover' && !next[k])).map(k => ({ field: k, label: FIELD_LABELS[k] || k, from: '—', to: displayValue(next, k) }));
  return tracked.filter(k => String(previous[k] ?? '') !== String(next[k] ?? '')).map(k => ({ field: k, label: FIELD_LABELS[k] || k, from: displayValue(previous, k), to: displayValue(next, k) }));
}
export async function recordShiftHistory(entities, shiftId, action, user, detail, changes = [], context = {}) {
  try {
    await entities.ShiftHistory.create({
      shift_id: shiftId,
      shift_date: context.shift_date || '',
      client_id: context.client_id || '',
      action,
      actor_id: user?.id || '',
      actor_name: user?.full_name || user?.email || 'System',
      actor_role: user?.role || '',
      locked_at_change: !!context.locked,
      detail: String(detail || '').slice(0, 2000),
      changes,
    });
  } catch (_) { /* best-effort audit log; never block the roster change */ }
}