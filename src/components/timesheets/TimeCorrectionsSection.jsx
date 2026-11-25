import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';
import CorrectionReviewCard from '@/components/timesheets/CorrectionReviewCard';
import { Button } from '@/components/ui/button';

export default function TimeCorrectionsSection({ onChanged }) {
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState('');
  const load = async () => {
    setError('');
    try { const { data } = await api.functions.invoke('workerTimesheet', { action: 'reviews' }); setRequests(data.corrections); }
    catch (err) { setError(err.response?.data?.error || 'Unable to load correction requests.'); }
  };
  useEffect(() => { load(); }, []);
  const updated = async () => { await load(); await onChanged(); };
  return <section className="space-y-5">
    <div><h1 className="font-heading text-2xl font-bold">Time corrections</h1><p className="text-sm text-muted-foreground">Review proposed times before they change recorded hours and payroll.</p></div>
    {error ? <div role="alert"><p className="text-destructive">{error}</p><Button variant="outline" onClick={load}>Try again</Button></div> : !requests ? <p role="status" className="text-muted-foreground">Loading correction requests…</p> : <>
      <h2 className="font-semibold">Awaiting approval ({requests.filter(r => r.status === 'pending').length})</h2>
      {!requests.some(r => r.status === 'pending') && <p className="text-sm text-muted-foreground">No corrections awaiting approval.</p>}
      {requests.filter(r => r.status === 'pending').map(request => <CorrectionReviewCard key={request.id} request={request} onChanged={updated} />)}
      {requests.some(r => r.status !== 'pending') && <><h2 className="font-semibold pt-3">Reviewed corrections</h2>{requests.filter(r => r.status !== 'pending').map(request => <CorrectionReviewCard key={request.id} request={request} onChanged={updated} />)}</>}
    </>}
  </section>;
}