import React, { useState } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDate, formatTime } from '@/lib/format';

export default function CorrectionReviewCard({ request, onChanged }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const review = async decision => {
    setBusy(true); setError('');
    try { await api.functions.invoke('workerTimesheet', { action: 'review', correction_id: request.id, decision, admin_notes: note }); await onChanged(); }
    catch (err) { setError(err.response?.data?.error || 'Unable to review this request.'); }
    finally { setBusy(false); }
  };
  return <article data-correction-id={request.id} className="rounded-xl border bg-card p-5 space-y-3">
    <div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold">{request.worker_name}</h3><p className="text-sm text-muted-foreground">{request.client_name} · {formatDate(request.shift_date)}</p></div><p className="text-sm font-medium capitalize">{request.status}</p></div>
    <div className="grid sm:grid-cols-2 gap-3 text-sm"><p>Recorded: {formatTime(request.original_clock_in)} – {formatTime(request.original_clock_out)}</p><p className="font-semibold">Requested: {formatTime(request.proposed_clock_in)} – {formatTime(request.proposed_clock_out)}</p></div>
    <p className="text-sm whitespace-pre-wrap">{request.reason}</p>
    {request.status === 'pending' ? <><Textarea aria-label="Admin response" placeholder="Optional response to worker" maxLength={2000} value={note} onChange={e => setNote(e.target.value)} /><div className="flex gap-2"><Button disabled={busy} onClick={() => review('approved')}>{busy ? 'Saving…' : 'Approve correction'}</Button><Button variant="outline" disabled={busy} onClick={() => review('declined')}>Decline</Button></div></> : <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.admin_notes || 'Reviewed'} · {formatDate(request.reviewed_at)}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </article>;
}