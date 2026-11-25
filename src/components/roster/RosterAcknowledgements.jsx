import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';

export default function RosterAcknowledgements({ workerId, onChanged }) {
  const [page, setPage] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState('');
  const load = async (cursor) => {
    const { data } = await api.functions.invoke('rosterAcknowledgements', { action: 'list', worker_id: workerId, cursor });
    setPage(previous => cursor ? { ...data, items: [...previous.items, ...data.items] } : data);
  };
  useEffect(() => {
    load().catch(() => setError('Unable to load roster change requests.'));
    return api.entities.RosterAcknowledgement.subscribe(() => load().catch(() => setError('Unable to refresh requests.')));
  }, [workerId]);
  const acknowledge = async (request) => {
    setBusy(request.id); setError('');
    try {
      await api.functions.invoke('rosterAcknowledgements', { action: 'acknowledge', request_id: request.id });
      await Promise.all([load(), onChanged?.()]);
    } catch (err) { setError(err.response?.data?.error || 'Unable to acknowledge this change.'); }
    finally { setBusy(''); }
  };
  return <section aria-label="Roster change requests" className="space-y-3 rounded-xl border bg-card p-4 text-card-foreground">
    <h2 className="font-heading text-lg font-bold">Roster change requests</h2>
    <p className="text-sm text-muted-foreground">Managers can change locked shifts, but you must acknowledge changes made within seven days of the support.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error} <Button variant="outline" size="sm" onClick={() => load().then(() => setError('')).catch(() => setError('Unable to load requests.'))}>Retry</Button></p>}
    {!page && !error && <p role="status" className="text-sm text-muted-foreground">Loading requests…</p>}
    {page?.items.length === 0 && <p className="text-sm text-muted-foreground">No changes awaiting your acknowledgement.</p>}
    {page?.items.map(request => <article key={request.id} data-roster-request={request.id} className="space-y-2 rounded-lg border bg-muted p-3">
      <p className="text-sm font-semibold">{request.client_name} · {request.change_type === 'removal' ? 'Shift removed from your roster' : request.change_type === 'assignment' ? 'New assignment' : 'Shift changed'}</p>
      {request.previous_summary && <p className="text-sm text-muted-foreground">Previously: {request.previous_summary}</p>}
      <p className="text-sm">Now: {request.current_summary}</p>
      <Button size="sm" disabled={!!busy || !request.can_acknowledge} onClick={() => acknowledge(request)}>{busy === request.id ? 'Saving…' : 'Acknowledge change'}</Button>
      {!request.can_acknowledge && <p className="text-xs text-muted-foreground">Only the assigned worker can acknowledge this request.</p>}
    </article>)}
    {page?.has_more && <Button variant="outline" disabled={!!busy} onClick={() => load(page.next_cursor).catch(() => setError('Unable to load more requests.'))}>Load more requests</Button>}
  </section>;
}