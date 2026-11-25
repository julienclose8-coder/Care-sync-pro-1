import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatTime } from '@/lib/format';

export default function LeaveRequestCard({ request, manager, onReview, busy }) {
  return <article className="rounded-lg border bg-card p-4 space-y-2">
    <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-sm">{request.request_type === 'leave' ? 'Leave' : 'Unavailability'}{manager ? ` · ${request.worker_name}` : ''}</h3><Badge variant={request.status === 'declined' ? 'destructive' : 'secondary'} className="capitalize">{request.status}</Badge></div>
    <p className="text-sm">{formatDate(request.start_date)}{!request.all_day && ` ${formatTime(request.start_time)}`} – {formatDate(request.end_date)}{!request.all_day && ` ${formatTime(request.end_time)}`}{request.all_day && ' · Whole days'}</p>
    {request.reason && <p className="text-sm whitespace-pre-wrap break-words text-muted-foreground">{request.reason}</p>}
    {request.reviewed_at && <p className="text-xs text-muted-foreground">Reviewed {formatDate(request.reviewed_at.slice(0, 10))}</p>}
    {manager && request.status === 'pending' && <div className="flex flex-wrap gap-2 pt-1"><Button type="button" size="sm" disabled={busy} onClick={() => onReview(request.id, 'approved')}>Approve</Button><Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onReview(request.id, 'declined')}>Decline</Button></div>}
  </article>;
}