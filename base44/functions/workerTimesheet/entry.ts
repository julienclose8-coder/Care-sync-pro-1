import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    if (!(await base44.auth.isAuthenticated())) return Response.json({ error: 'Please sign in.' }, { status: 401 });
    const user = await base44.auth.me();
    const body = await req.json();
    const admin = user.role === 'admin';
    const workerId = admin && body.worker_id ? String(body.worker_id) : user.id;
    const fail = (error, status = 400) => Response.json({ error }, { status });
    const service = base44.asServiceRole.entities;
    if (body.action === 'clock') {
      if (!['in', 'out'].includes(body.direction) || typeof body.shift_id !== 'string') return fail('Choose a valid clock action.');
      const shift = await base44.entities.Shift.get(body.shift_id);
      if (shift.worker_id !== user.id && !admin) return fail('This support is not assigned to you.', 403);
      if (!shift.worker_id || shift.status !== 'scheduled') return fail('This support is not available for clocking.');
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      const now = new Intl.DateTimeFormat('en-GB', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
      if (body.direction === 'in' && (shift.date !== today || shift.clock_in || shift.clock_out)) return fail('Clock in on the support day only. For missing past times, request a correction.');
      if (body.direction === 'out' && (!shift.clock_in || shift.clock_out || shift.date > today)) return fail('This support is not currently clocked in.');
      await service.Shift.update(shift.id, body.direction === 'in' ? { clock_in: now } : { clock_out: now, status: 'completed' });
      return Response.json({ ok: true });
    }
    if (body.action === 'list') {
      const [shifts, corrections, notes] = await Promise.all([
        base44.entities.Shift.filter({ worker_id: workerId }, '-date', 1000),
        base44.entities.TimeCorrection.filter({ worker_id: workerId }, '-created_date', 1000),
        base44.entities.CareNote.filter({ author_id: workerId }, '-created_date', 1000),
      ]);
      const clients = await Promise.all([...new Set(shifts.map(s => s.client_id))].map(id => base44.entities.Client.get(id)));
      const worker = workerId === user.id ? user : await base44.entities.User.get(workerId);
      return Response.json({ shifts, corrections, notes, clients, worker: { id: worker.id, full_name: worker.full_name, email: worker.email } });
    }
    if (body.action === 'submit') {
      if (typeof body.shift_id !== 'string') return fail('Choose a support.');
      const shift = await base44.entities.Shift.get(body.shift_id);
      if (shift.worker_id !== user.id && !admin) return fail('This support is not assigned to you.', 403);
      if (!shift.worker_id || shift.status === 'cancelled') return fail('This support cannot be corrected.');
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      if (shift.date > today) return fail('Corrections are only available for today or earlier.');
      const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
      if (!validTime(body.clock_in) || !validTime(body.clock_out) || body.clock_in === body.clock_out) return fail('Enter different, valid clock-in and clock-out times.');
      const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
      if (!reason || reason.length > 2000) return fail('Enter a reason of up to 2,000 characters.');
      const pending = await base44.entities.TimeCorrection.filter({ shift_id: shift.id, status: 'pending' });
      if (pending.length) return fail('A correction for this support is already awaiting approval.', 409);
      const [worker, client] = await Promise.all([service.User.get(shift.worker_id), base44.entities.Client.get(shift.client_id)]);
      // Workers cannot create or change approval records directly; validated submissions are pending only.
      const correction = await service.TimeCorrection.create({ shift_id: shift.id, worker_id: shift.worker_id, worker_name: worker.full_name || 'Support worker', client_name: client.full_name, shift_date: shift.date, original_clock_in: shift.clock_in || '', original_clock_out: shift.clock_out || '', original_status: shift.status, proposed_clock_in: body.clock_in, proposed_clock_out: body.clock_out, reason, status: 'pending' });
      return Response.json({ correction });
    }
    if (body.action === 'reviews') {
      if (!admin) return fail('Admin approval required.', 403);
      return Response.json({ corrections: await base44.entities.TimeCorrection.list('-created_date', 1000) });
    }
    if (body.action === 'review') {
      if (!admin) return fail('Admin approval required.', 403);
      if (!['approved', 'declined'].includes(body.decision) || typeof body.correction_id !== 'string') return fail('Choose an approval decision.');
      const correction = await base44.entities.TimeCorrection.get(body.correction_id);
      if (correction.status !== 'pending') return fail('This request has already been reviewed.', 409);
      const adminNotes = typeof body.admin_notes === 'string' ? body.admin_notes.trim().slice(0, 2000) : '';
      if (body.decision === 'approved') {
        const shift = await base44.entities.Shift.get(correction.shift_id);
        if (shift.worker_id !== correction.worker_id || shift.status === 'cancelled') return fail('The support assignment changed or was cancelled. Decline this request.', 409);
        const original = (shift.clock_in || '') === correction.original_clock_in && (shift.clock_out || '') === correction.original_clock_out && shift.status === correction.original_status;
        const applied = shift.clock_in === correction.proposed_clock_in && shift.clock_out === correction.proposed_clock_out && shift.status === 'completed';
        if (!original && !applied) return fail('Recorded times changed since this request. Decline it and ask for a new correction.', 409);
        if (!applied) await base44.entities.Shift.update(shift.id, { clock_in: correction.proposed_clock_in, clock_out: correction.proposed_clock_out, status: 'completed' });
      }
      const updated = await base44.entities.TimeCorrection.update(correction.id, { status: body.decision, admin_notes: adminNotes, reviewed_by: user.id, reviewed_at: new Date().toISOString() });
      return Response.json({ correction: updated });
    }
    return fail('Unknown timesheet action.');
  } catch (error) {
    return Response.json({ error: 'Unable to complete this timesheet action. Please try again.' }, { status: 500 });
  }
}