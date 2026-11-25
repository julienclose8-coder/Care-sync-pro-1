import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatTime, shiftHours } from '@/lib/format';

export default function TimesheetRow({ shift, client, correction, onCorrect, onNote }) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const complete = shift.clock_in && shift.clock_out;
  return <article data-shift-id={shift.id} className="rounded-xl border bg-card p-4 space-y-3">
    <div className="flex flex-wrap justify-between gap-2"><div><p className="font-semibold">{client?.full_name || 'Client'}</p><p className="text-sm text-muted-foreground">{formatDate(shift.date)} · {shift.service_type}</p></div><Badge variant="secondary" className="self-start capitalize">{shift.status}</Badge></div>
    <p className="text-xs text-muted-foreground">Scheduled: {formatTime(shift.start_time)} – {formatTime(shift.end_time)}</p>
    <dl className="grid grid-cols-3 gap-2 text-sm"><div><dt className="text-muted-foreground">Clocked in</dt><dd className="font-medium">{formatTime(shift.clock_in)}</dd></div><div><dt className="text-muted-foreground">Clocked out</dt><dd className="font-medium">{formatTime(shift.clock_out)}</dd></div><div><dt className="text-muted-foreground">Recorded hours</dt><dd className="font-medium">{complete ? shiftHours(shift.clock_in, shift.clock_out).toFixed(2) : '—'}</dd></div></dl>
    {!complete && shift.date <= today && shift.status !== 'cancelled' && <p className="text-xs text-muted-foreground">{shift.clock_in ? 'Clock-out not recorded.' : 'Clock-in not recorded.'} Request a correction if needed.</p>}
    {correction && <div className="rounded-lg bg-muted/50 p-3 text-sm"><p className="font-medium capitalize">Correction {correction.status === 'pending' ? 'awaiting approval' : correction.status}</p><p>{formatTime(correction.proposed_clock_in)} – {formatTime(correction.proposed_clock_out)}</p><p className="text-muted-foreground whitespace-pre-wrap">{correction.reason}</p>{correction.admin_notes && <p className="mt-1 whitespace-pre-wrap">Admin: {correction.admin_notes}</p>}</div>}
    <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={onNote}>Progress note</Button>{shift.status !== 'cancelled' && shift.date <= today && <Button variant="outline" size="sm" disabled={correction?.status === 'pending'} onClick={onCorrect}>{correction?.status === 'pending' ? 'Awaiting admin approval' : 'Request correction'}</Button>}</div>
  </article>;
}