import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import WeeklyTimesheet from '@/components/timesheets/WeeklyTimesheet';
import { usePageRefresh } from '@/hooks/usePullToRefresh';

export default function WorkerTimesheet() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const workerId = new URLSearchParams(window.location.search).get('worker_id');
  const load = async () => {
    setError('');
    try { const response = await api.functions.invoke('workerTimesheet', { action: 'list', worker_id: workerId }); setData(response.data); }
    catch (err) { setError(err.response?.data?.error || 'Unable to load your timesheet.'); }
  };
  usePageRefresh(load);
  useEffect(() => { load(); }, [workerId]);
  return <div className="min-h-screen bg-muted/30"><main className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-heading text-2xl font-bold">My timesheet</h1><p className="text-sm text-muted-foreground">Weekly supports, recorded times and correction requests.</p></div><Button asChild variant="outline"><Link to="/?preview=worker">Upcoming support</Link></Button></div>
    {error ? <div role="alert" className="text-destructive space-y-2"><p>{error}</p><Button variant="outline" onClick={load}>Try again</Button></div> : !data ? <p role="status" className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /> Loading timesheet…</p> : <WeeklyTimesheet data={data} onChanged={load} />}
  </main></div>;
}