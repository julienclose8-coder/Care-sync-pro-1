import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { recordShiftHistory, rosterLocked } from '../../shared/rosterChanges.ts';

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Please sign in.' }, { status: 401 });

    const { shift_id, reason } = await req.json().catch(() => ({}));
    if (typeof shift_id !== 'string' || !shift_id || shift_id.length > 100) {
      return Response.json({ error: 'A shift is required.' }, { status: 400 });
    }
    const reasonText = typeof reason === 'string' ? reason.trim().slice(0, 1000) : '';

    const shift = await base44.asServiceRole.entities.Shift.get(shift_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!shift) return Response.json({ error: 'Shift no longer exists.' }, { status: 404 });
    if (shift.worker_id !== user.id && user.role !== 'admin') {
      return Response.json({ error: 'You can only call in sick for your own shifts.' }, { status: 403 });
    }
    if (shift.status !== 'scheduled') {
      return Response.json({ error: 'This shift can no longer be flagged for a replacement.' }, { status: 409 });
    }
    if (shift.date < today()) {
      return Response.json({ error: 'You can only call in sick for upcoming shifts.' }, { status: 409 });
    }
    if (shift.needs_replacement) {
      return Response.json({ error: 'This shift is already flagged for a replacement.' }, { status: 409 });
    }

    const client = await base44.asServiceRole.entities.Client.get(shift.client_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    const workerName = user.full_name || user.email;
    const clientName = client?.full_name || 'the client';

    await base44.asServiceRole.entities.Shift.update(shift.id, {
      needs_replacement: true,
      replacement_reason: reasonText,
    });
    await recordShiftHistory(base44.asServiceRole.entities, shift.id, 'called_in_sick', user, `Called in sick${reasonText ? `: ${reasonText}` : ''}`, [], { shift_date: shift.date, client_id: shift.client_id, locked: rosterLocked(shift.date) });

    const admins = await base44.asServiceRole.entities.User.list().catch(() => []);
    const adminList = Array.isArray(admins) ? admins : (admins.items || []);
    const emails = adminList.filter((u) => u.role === 'admin' && u.email).map((u) => u.email);
    if (emails.length) {
      const subject = `Sick leave: ${workerName} — ${clientName}, ${shift.date} ${shift.start_time}–${shift.end_time}`;
      const body = `${workerName} has called in sick and flagged their shift for a replacement.

Client: ${clientName}
Date: ${shift.date}
Time: ${shift.start_time}–${shift.end_time}
Service: ${shift.service_type || 'Support'}${reasonText ? `\nReason: ${reasonText}` : ''}

Open the roster to assign a replacement.`;
      await Promise.allSettled(emails.map((to) =>
        base44.asServiceRole.integrations.Core.SendEmail({ to, subject, text: body, category: 'transactional' })
      ));
    }

    return Response.json({ ok: true, shift_id: shift.id });
  } catch (error) {
    return Response.json({ error: error.message || 'Unable to record sick leave.' }, { status: 500 });
  }
}