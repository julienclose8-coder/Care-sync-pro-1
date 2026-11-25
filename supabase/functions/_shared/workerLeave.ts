const DAY = 86400000;
export function leaveInterval(request) {
  return {
    start: Date.parse(`${request.start_date}T${request.all_day ? '00:00' : request.start_time}:00Z`),
    end: Date.parse(`${request.end_date}T${request.all_day ? '00:00' : request.end_time}:00Z`) + (request.all_day ? DAY : 0),
  };
}
export function overlapsLeave(request, times) {
  const leave = leaveInterval(request);
  return leave.start < times.end && leave.end > times.start;
}
export function workerOnLeave(requests, workerId, times) {
  return requests.some(request => (request.worker_ids || [request.worker_id]).includes(workerId) && overlapsLeave(request, times));
}
export async function approvedLeave(entities, from, to, workerId) {
  const query = { status: 'approved', start_date: { $lte: to }, end_date: { $gte: from }, ...(workerId ? { worker_ids: { $in: [workerId] } } : {}) };
  const result = [];
  let cursor;
  do {
    const page = await entities.WorkerLeaveRequest.filter(query, { limit: 200, sort: 'start_date', ...(cursor ? { cursor } : {}) });
    result.push(...page.items);
    cursor = page.has_more ? page.next_cursor : null;
    if (cursor && result.length >= 2000) throw Object.assign(new Error('Too many leave requests to check safely. Narrow the date range.'), { status: 409 });
  } while (cursor);
  return result;
}