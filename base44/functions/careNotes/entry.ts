import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    if (!(await base44.auth.isAuthenticated())) return Response.json({ error: 'Please sign in.' }, { status: 401 });
    const user = await base44.auth.me();
    const body = await req.json();
    const admin = user.role === 'admin', service = base44.asServiceRole.entities;
    const fail = (error, status = 400) => Response.json({ error }, { status });
    if (!['list', 'save', 'delete'].includes(body.action)) return fail('Choose a valid notes action.');
    let existing = null;
    if (body.id) {
      if (typeof body.id !== 'string' || body.id.length > 100) return fail('Choose a valid note.');
      existing = await service.CareNote.get(body.id);
      if (!existing) return fail('Note not found.', 404);
      if (existing.note_category === 'locked_concern' && existing.author_id !== user.id) return fail('Only the author can change a locked note of concern.', 403);
    if (!admin && existing.author_id !== user.id && body.action !== 'list') return fail('Only the author or an admin can change this note.', 403);
    }
    const clientId = existing?.client_id || body.client_id;
    if (typeof clientId !== 'string' || !clientId || clientId.length > 100) return fail('Choose a client.');
    const client = await base44.entities.Client.get(clientId);
    if (!client) return fail('Client not found.', 404);
    if (!admin) {
      const [shifts, team] = await Promise.all([
        service.Shift.filter({ client_id: clientId, worker_id: user.id }, '-date', 1),
        service.SupportTeamMember.filter({ client_id: clientId, worker_id: user.id, status: 'approved' }, '-created_date', 1),
      ]);
      if (!shifts.length && !team.length) return fail('Notes are available only for your assigned clients.', 403);
    }
    if (body.action === 'list') {
      const notes = await service.CareNote.filter({ client_id: clientId }, '-created_date', 200);
      const visible = notes.filter(n => n.note_category !== 'locked_concern' || n.author_id === user.id);
      return Response.json({ notes: visible.map(n => ({ ...n, can_manage: admin || n.author_id === user.id })), client_name: client.full_name, limited: notes.length === 200 });
    }
    if (body.action === 'delete') {
      if (!existing) return fail('Choose a note to delete.');
      await service.CareNote.delete(existing.id);
      return Response.json({ ok: true });
    }
    const categories = ['general', 'support', 'supports', 'progress', 'medication', 'observation', 'behavioural', 'behaviours', 'moods', 'locked_concern'];
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!content || content.length > 20000) return fail('Enter a note of up to 20,000 characters.');
    if (!categories.includes(body.note_category)) return fail('Choose a note category.');
    const shiftId = existing?.shift_id || body.shift_id || '';
    if (typeof shiftId !== 'string' || shiftId.length > 100) return fail('Choose a valid support.');
    if (shiftId) {
      const shift = await service.Shift.get(shiftId);
      if (!shift || shift.client_id !== clientId || (!admin && shift.worker_id !== user.id)) return fail('This support is not assigned to you for this client.', 403);
    }
    const status = ['draft', 'final'].includes(body.status) ? body.status : (existing?.status || 'final');
    const payload = { content, note_category: body.note_category, status };
    if (body.note_category === 'behavioural') {
      if (!['positive', 'negative'].includes(body.behavioural_subtype)) return fail('Choose a positive or negative behaviour subtype.');
      payload.behavioural_subtype = body.behavioural_subtype;
    }
    const note = existing ? await service.CareNote.update(existing.id, payload) : await service.CareNote.create({ ...payload, client_id: clientId, shift_id: shiftId, author_id: user.id, author_name: user.full_name || user.email });
    return Response.json({ note });
  } catch (error) {
    return Response.json({ error: 'Unable to complete this notes action. Please try again.' }, { status: 500 });
  }
}