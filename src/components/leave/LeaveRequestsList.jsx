import React, { useEffect, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import MobileSelect from '@/components/mobile/MobileSelect';
import LeaveRequestCard from '@/components/leave/LeaveRequestCard';

export default function LeaveRequestsList({ workerId, manager = false }) {
  const cache = useQueryClient(), [status, setStatus] = useState(manager ? 'pending' : ''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const query = useInfiniteQuery({
    queryKey: ['worker-leave', manager, workerId, status], initialPageParam: null,
    queryFn: async ({ pageParam }) => (await base44.functions.invoke('workerLeave', { action: manager ? 'reviews' : 'list', worker_id: workerId, status, ...(pageParam ? { cursor: pageParam } : {}) })).data,
    getNextPageParam: page => page.has_more ? page.next_cursor : undefined,
  });
  useEffect(() => base44.entities.WorkerLeaveRequest.subscribe(() => cache.invalidateQueries({ queryKey: ['worker-leave'] })), [cache]);
  const review = async (request_id, decision) => {
    setBusy(true); setError('');
    try { await base44.functions.invoke('workerLeave', { action: 'review', request_id, decision }); await cache.invalidateQueries({ queryKey: ['worker-leave'] }); }
    catch (err) { setError(err.response?.data?.error || 'Unable to review this request.'); }
    finally { setBusy(false); }
  };
  const records = query.data?.pages.flatMap(page => page.items) || [];
  return <section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-heading font-bold text-lg">{manager ? 'Worker leave & unavailability' : 'My requests'}</h2><Button type="button" variant="outline" size="sm" disabled={query.isFetching} onClick={() => query.refetch()}>Refresh</Button></div>
    {manager && <><p className="text-sm text-muted-foreground">Approve or decline dated requests. Reassign overlapping roster shifts before approving.</p><MobileSelect aria-label="Request status" value={status} onValueChange={next => { setStatus(next); setError(''); }} options={[{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'declined', label: 'Declined' }, { value: '', label: 'All requests' }]} /></>}
    {(error || query.isError) && <p role="alert" className="text-sm text-destructive">{error || query.error?.response?.data?.error || 'Unable to load requests. Please refresh.'}</p>}
    {query.isPending ? <p role="status" className="text-sm text-muted-foreground">Loading requests…</p> : !query.isError && !records.length ? <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-5">No {status ? `${status} ` : ''}requests yet.</p> : records.map(request => <LeaveRequestCard key={request.id} request={request} manager={manager} onReview={review} busy={busy} />)}
    {query.hasNextPage && <Button type="button" variant="outline" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>{query.isFetchingNextPage ? 'Loading…' : 'Load more'}</Button>}
  </section>;
}