import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req), user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Please sign in.' }, { status: 401 });
    const body = await req.json();
    const owns = record => record.worker_id === user.id || (!!user.email && record.worker_email === user.email);
    if (body.action === 'list') {
      if (body.cursor && (typeof body.cursor !== 'string' || body.cursor.length > 4000)) return Response.json({ error: 'Invalid page.' }, { status: 400 });
      const scope = user.role === 'admin' && body.worker_id && body.worker_id !== user.id
        ? { worker_id: String(body.worker_id).slice(0, 100) }
        : { $or: [{ worker_id: user.id }, ...(user.email ? [{ worker_email: user.email }] : [])] };
      const page = await base44.entities.RosterAcknowledgement.filter({ $and: [scope, { status: 'pending' }] }, { sort: '-created_date', limit: 20, cursor: body.cursor || undefined });
      return Response.json({ ...page, items: page.items.map(record => ({ ...record, can_acknowledge: owns(record) })) });
    }
    if (body.action !== 'acknowledge' || typeof body.request_id !== 'string' || !body.request_id || body.request_id.length > 100) return Response.json({ error: 'Choose a valid request.' }, { status: 400 });
    // Elevation is limited to an authenticated worker acknowledging their own controlled request.
    const service = base44.asServiceRole.entities;
    const request = await service.RosterAcknowledgement.get(body.request_id);
    if (!request || !owns(request)) return Response.json({ error: 'Only the worker receiving this request can acknowledge it.' }, { status: 403 });
    if (request.status === 'acknowledged') return Response.json({ ok: true });
    if (request.status !== 'pending') return Response.json({ error: 'A newer change replaced this request. Refresh your requests.' }, { status: 409 });
    const acknowledged_at = new Date().toISOString(), acknowledged_by = user.id;
    if (request.change_type !== 'removal') {
      const shift = await service.Shift.get(request.shift_id);
      if (!shift || shift.roster_revision !== request.revision || shift.worker_id !== request.worker_id) return Response.json({ error: 'This assignment changed again. Refresh before acknowledging it.' }, { status: 409 });
      await service.Shift.updateMany({ id: shift.id, roster_revision: request.revision, worker_id: request.worker_id, acknowledgement_status: 'pending' }, { $set: { acknowledgement_status: 'acknowledged', acknowledged_at, acknowledged_by } });
      const current = await service.Shift.get(shift.id);
      if (current.roster_revision !== request.revision || current.acknowledged_by !== user.id) return Response.json({ error: 'This shift changed while you were acknowledging it. Refresh your requests.' }, { status: 409 });
    }
    await service.RosterAcknowledgement.updateMany({ id: request.id, status: 'pending' }, { $set: { status: 'acknowledged', acknowledged_at, acknowledged_by } });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message || 'Unable to update the acknowledgement.' }, { status: 500 });
  }
}