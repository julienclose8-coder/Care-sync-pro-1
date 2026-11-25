import { createAppClient } from '../../_shared/server.ts';
import { recordShiftHistory, rosterLocked } from '../../_shared/rosterChanges.ts';

async function handler(req: Request) {
  try {
    const app = createAppClient(req);
    const user = await app.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { shift_id: shiftId } = await req.json();
    if (!shiftId || typeof shiftId !== 'string') {
      return Response.json({ error: 'A shift is required' }, { status: 400 });
    }

    const shift = await app.asServiceRole.entities.Shift.get(shiftId);
    if (!shift) return Response.json({ error: 'Shift not found' }, { status: 404 });

    const client = await app.asServiceRole.entities.Client.get(shift.client_id);
    const isClient = client?.email && user.email && client.email.toLowerCase() === user.email.toLowerCase();
    if (user.role !== 'admin' && !isClient) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (shift.status === 'completed') {
      return Response.json({ error: 'A completed shift cannot be cancelled' }, { status: 409 });
    }

    if (shift.status !== 'cancelled') {
      await app.asServiceRole.entities.Shift.update(shift.id, { status: 'cancelled' });
      await recordShiftHistory(app.asServiceRole.entities, shift.id, 'cancelled', user, `Cancelled by ${isClient ? 'client' : 'management'}`, [], { shift_date: shift.date, client_id: shift.client_id, locked: rosterLocked(shift.date) });
    }

    const existing = await app.asServiceRole.entities.SupportRequest.filter({ shift_id: shift.id, request_type: 'cancel' });
    if (existing.length === 0) {
      await app.asServiceRole.entities.SupportRequest.create({
        client_id: client.id,
        shift_id: shift.id,
        request_type: 'cancel',
        service_type: shift.service_type || 'Other',
        details: `Client cancelled support for ${shift.date}, ${shift.start_time}–${shift.end_time}.`,
        status: 'pending'
      });
    }

    return Response.json({ cancelled: true, shift_id: shift.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export default handler;
