import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

import { iso, interval, validateRosterShift, saveRosterChange } from '../../shared/rosterChanges.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Please sign in.' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Only authorised management accounts can move roster shifts.' }, { status: 403 });
    const { shift_id, date, worker_id, expected_updated_at } = await req.json();
    if (typeof shift_id !== 'string' || !shift_id || shift_id.length > 100 || typeof worker_id !== 'string' || worker_id.length > 100 || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || iso(`${date}T00:00:00Z`) !== date) return Response.json({ error: 'Choose a valid shift, day and staff row.' }, { status: 400 });
    const entities = base44.entities;
    const shift = await entities.Shift.get(shift_id);
    if (!shift) return Response.json({ error: 'Shift no longer exists. Refresh the roster.' }, { status: 404 });
    if (shift.status !== 'scheduled' || shift.clock_in || shift.clock_out) return Response.json({ error: 'Only scheduled shifts that have not started can be moved.' }, { status: 409 });
    if (expected_updated_at && shift.updated_date !== expected_updated_at) return Response.json({ error: 'This shift changed since it was loaded. Refresh before moving it.' }, { status: 409 });
    const proposed = { ...shift, date, worker_id };
    const times = interval(proposed);
    if (!Number.isFinite(times.start) || !Number.isFinite(times.end)) return Response.json({ error: 'Edit the shift to correct its times before moving it.' }, { status: 400 });
    const { worker, warning } = await validateRosterShift(entities, proposed, shift_id);
    const result = await saveRosterChange(entities, shift, { date, worker_id, worker_name: worker ? worker.full_name || worker.email || 'Support worker' : '' }, user, worker);
    return Response.json({ ...result, warning });
  } catch (error) {
    return Response.json({ error: error.message || 'The shift could not be moved.' }, { status: error.status || 500 });
  }
}