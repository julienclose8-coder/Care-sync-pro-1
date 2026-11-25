import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { validDate, iso, interval } from '../../shared/rosterChanges.ts';
import { leaveInterval, overlapsLeave } from '../../shared/workerLeave.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(e => e.status === 401 ? null : Promise.reject(e));
    if (!user) return Response.json({ error: 'Please sign in.' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const admin = user.role === 'admin', svc = base44.asServiceRole.entities;
    const fail = (error, status = 400) => Response.json({ error }, { status });
    if (['list', 'reviews'].includes(body.action)) {
      if (body.action === 'reviews' && !admin) return fail('Manager approval access required.', 403);
      if (body.worker_id !== undefined && (typeof body.worker_id !== 'string' || body.worker_id.length > 100)) return fail('Choose a valid worker.');
      if (body.status && !['pending', 'approved', 'declined'].includes(body.status)) return fail('Choose a valid status.');
      if (body.cursor !== undefined && (typeof body.cursor !== 'string' || body.cursor.length > 4000)) return fail('Invalid page.');
      const workerId = admin && body.worker_id ? body.worker_id : user.id;
      const query = { ...(body.action === 'reviews' ? {} : { worker_id: workerId }), ...(body.status ? { status: body.status } : {}) };
      const page = await base44.entities.WorkerLeaveRequest.filter(query, { limit: 20, sort: '-created_date', ...(body.cursor ? { cursor: body.cursor } : {}) });
      return Response.json(page);
    }
    if (body.action === 'submit') {
      if (body.worker_id !== undefined && (typeof body.worker_id !== 'string' || body.worker_id.length > 100)) return fail('Choose a valid worker.');
      const workerId = admin && body.worker_id ? body.worker_id : user.id;
      const worker = workerId === user.id ? user : await svc.User.get(workerId).catch(e => e.status === 404 ? null : Promise.reject(e));
      if (!worker || worker.role === 'admin') return fail('Use a worker account to apply for leave.', 403);
      if (await svc.Client.count({ email: worker.email })) return fail('Only workers can apply for leave.', 403);
      if (!['leave', 'unavailability'].includes(body.request_type) || typeof body.all_day !== 'boolean') return fail('Choose leave or unavailability and a date option.');
      if (!validDate(body.start_date) || !validDate(body.end_date) || body.end_date < body.start_date) return fail('Enter a valid start and end date.');
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      if (body.start_date < today) return fail('Choose today or a future start date.');
      const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
      if (!body.all_day && (!validTime(body.start_time) || !validTime(body.end_time))) return fail('Enter valid start and end times.');
      const data = { request_type: body.request_type, start_date: body.start_date, end_date: body.end_date, all_day: body.all_day, start_time: body.all_day ? '' : body.start_time, end_time: body.all_day ? '' : body.end_time };
      const times = leaveInterval(data);
      if (times.end <= times.start || times.end - times.start > 366 * 86400000) return fail('The end must follow the start, with no more than one year per request.');
      const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
      if (reason.length > 2000) return fail('Keep the reason within 2,000 characters.');
      const [profiles, existing] = await Promise.all([
        svc.Worker.filter({ email: worker.email }, { limit: 100, fields: ['id'] }),
        svc.WorkerLeaveRequest.filter({ worker_id: workerId, status: { $in: ['pending', 'approved'] }, start_date: { $lte: data.end_date }, end_date: { $gte: data.start_date } }, { limit: 200 })
      ]);
      if (profiles.has_more || existing.has_more) return fail('Too many matching records to check safely.', 409);
      if (existing.items.some(request => overlapsLeave(request, times))) return fail('You already have a pending or approved request overlapping these dates and times.', 409);
      const request = await svc.WorkerLeaveRequest.create({ ...data, worker_id: workerId, worker_ids: [workerId, ...profiles.items.map(p => p.id)], worker_name: worker.full_name || 'Support worker', reason, status: 'pending' });
      return Response.json({ request });
    }
    if (body.action === 'review') {
      if (!admin) return fail('Only managers can review requests.', 403);
      if (typeof body.request_id !== 'string' || !body.request_id || body.request_id.length > 100 || !['approved', 'declined'].includes(body.decision)) return fail('Choose a valid request and decision.');
      const request = await base44.entities.WorkerLeaveRequest.get(body.request_id).catch(e => e.status === 404 ? null : Promise.reject(e));
      if (!request) return fail('Request not found.', 404);
      if (request.status !== 'pending') return fail('This request has already been reviewed. Refresh the list.', 409);
      if (body.decision === 'approved') {
        const page = await base44.entities.Shift.filter({ worker_id: { $in: request.worker_ids || [request.worker_id] }, status: 'scheduled', date: { $gte: iso(Date.parse(`${request.start_date}T00:00:00Z`) - 86400000), $lte: request.end_date } }, { limit: 500 });
        if (page.has_more) return fail('Too many shifts to check safely. Narrow the request dates.', 409);
        const conflicts = page.items.filter(shift => overlapsLeave(request, interval(shift)));
        if (conflicts.length) return fail(`Reassign or cancel overlapping shifts in Roster before approving: ${conflicts.slice(0, 5).map(s => `${s.date} ${s.start_time}–${s.end_time}`).join(', ')}${conflicts.length > 5 ? ' (and more)' : ''}.`, 409);
      }
      const updated = await base44.entities.WorkerLeaveRequest.update(request.id, { status: body.decision, reviewed_by: user.id, reviewed_at: new Date().toISOString() });
      return Response.json({ request: updated });
    }
    return fail('Unknown request action.');
  } catch (error) {
    return Response.json({ error: error.message || 'Unable to complete this request.' }, { status: error.status || 500 });
  }
}