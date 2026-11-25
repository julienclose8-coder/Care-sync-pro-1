import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { validDate, rosterError, rosterLocked, validateRosterShift, saveRosterChange, recordShiftHistory } from '../../shared/rosterChanges.ts';

const fields = ['client_id', 'worker_id', 'date', 'start_time', 'end_time', 'service_type', 'support_setting', 'centre_name', 'centre_address', 'is_sleepover', 'sleep_start', 'sleep_end', 'goal_ids', 'recurrence_series_id', 'recurrence_mode', 'recurrence_end_date', 'recurrence_week_count', 'status', 'notes'];
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req), user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Please sign in.' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Only authorised management accounts can change the roster.' }, { status: 403 });
    const body = await req.json(), entities = base44.entities;
    if (body.shift_id !== undefined && (typeof body.shift_id !== 'string' || !body.shift_id || body.shift_id.length > 100)) throw rosterError('Choose a valid shift.');
    const previous = body.shift_id ? await entities.Shift.get(body.shift_id) : null;
    if (body.shift_id && !previous) throw rosterError('This shift no longer exists.', 404);
    if (body.expected_updated_at && previous?.updated_date !== body.expected_updated_at) throw rosterError('This shift has changed. Refresh before saving.', 409);
    if (body.action === 'delete') {
      if (!previous) throw rosterError('Choose a shift to delete.');
      let requests = [];
      if (previous.status === 'scheduled') ({ requests } = await saveRosterChange(entities, previous, { status: 'cancelled' }, user));
      await entities.Shift.delete(previous.id);
      await recordShiftHistory(entities, previous.id, 'deleted', user, 'Shift deleted', [], { shift_date: previous.date, client_id: previous.client_id, locked: rosterLocked(previous.date) });
      return Response.json({ deleted: true, requests });
    }
    const incoming = body.shift || body.changes;
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) throw rosterError('Enter the shift details.');
    const payload = Object.fromEntries(fields.filter(key => incoming[key] !== undefined).map(key => [key, incoming[key]]));
    for (const [key, value] of Object.entries(payload)) {
      if (key === 'goal_ids') { if (!Array.isArray(value) || value.length > 100 || value.some(id => typeof id !== 'string' || id.length > 100)) throw rosterError('Choose valid goals.'); }
      else if (key === 'is_sleepover') { if (typeof value !== 'boolean') throw rosterError('Choose a valid sleepover setting.'); }
      else if (key === 'recurrence_week_count') { if (!Number.isInteger(value) || value < 1 || value > 104) throw rosterError('Choose up to 104 recurring weeks.'); }
      else if (typeof value !== 'string' || value.length > (key === 'notes' ? 20000 : 300)) throw rosterError(`Check the ${key.replaceAll('_', ' ')}.`);
    }
    const next = { status: 'scheduled', worker_id: '', ...previous, ...payload };
    const dates = body.dates === undefined ? [next.date] : body.dates;
    if (!Array.isArray(dates) || !dates.length || dates.length > 104 || dates.some(date => !validDate(date)) || new Set(dates).size !== dates.length || (previous && dates.length !== 1)) throw rosterError('Choose up to 104 different valid shift dates.');
    const proposed = dates.map(date => ({ ...next, date }));
    // Validate every occurrence before saving any part of a recurring roster.
    const checked = [];
    for (let i = 0; i < proposed.length; i += 4) checked.push(...await Promise.all(proposed.slice(i, i + 4).map(shift => validateRosterShift(entities, shift, previous?.id || ''))));
    const saved = [], requests = [];
    try {
      for (let i = 0; i < proposed.length; i++) {
        const worker = checked[i].worker;
        const stored = { ...payload, client_id: proposed[i].client_id, date: dates[i], status: proposed[i].status, worker_id: proposed[i].worker_id || '', worker_name: worker ? worker.full_name || worker.email || 'Support worker' : '' };
        const result = await saveRosterChange(entities, previous, stored, user, worker);
        saved.push(result.shift); requests.push(...result.requests);
      }
    } catch (error) {
      if (!previous) {
        for (const request of requests) await entities.RosterAcknowledgement.delete(request.id);
        for (const shift of saved) await entities.Shift.delete(shift.id);
      }
      throw error;
    }
    return Response.json({ shift: saved[0], shifts: saved, requests, warnings: checked.map(result => result.warning).filter(Boolean) });
  } catch (error) {
    return Response.json({ error: error.message || 'Unable to save the roster.' }, { status: error.status || 500 });
  }
}