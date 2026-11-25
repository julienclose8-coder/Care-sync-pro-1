import React from 'react';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatTime, shiftHours } from '@/lib/format';

export default function PayrollClockDetails({ shifts, clients }) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const recorded = shifts.filter(s => s.status !== 'cancelled' && (s.date <= today || s.clock_in || s.clock_out || s.status === 'completed'))
    .sort((a, b) => `${b.date} ${b.start_time}`.localeCompare(`${a.date} ${a.start_time}`));
  const active = recorded.filter(s => s.clock_in && !s.clock_out && s.status === 'scheduled').length;
  return (
    <details className="basis-full min-w-0 border-t pt-3">
      <summary className="cursor-pointer text-sm font-medium text-primary">
        Clock-in &amp; out · {recorded.length} supports{active > 0 ? ` · ${active} clocked in now` : ''}
      </summary>
      <p className="text-xs text-muted-foreground mt-2">Payroll uses completed supports with both recorded times. Missing times and pending corrections do not add hours; approved corrections update these records.</p>
      {!recorded.length ? <p className="text-sm text-muted-foreground py-4">No clock records to show yet.</p> : (
        <div className="mt-3 space-y-3 max-h-96 overflow-y-auto">
          {recorded.map(s => {
            const complete = Boolean(s.clock_in && s.clock_out);
            const active = s.clock_in && !s.clock_out && s.status === 'scheduled';
            return <article key={s.id} data-payroll-shift={s.id} className="rounded-xl border bg-muted/30 p-3 space-y-3">
              <div className="flex flex-wrap justify-between gap-2">
                <div className="min-w-0"><p className="text-sm font-semibold break-words">{clients.find(c => c.id === s.client_id)?.full_name || 'Client'}</p><p className="text-xs text-muted-foreground">{formatDate(s.date)} · Scheduled {formatTime(s.start_time)} – {formatTime(s.end_time)}</p></div>
                <Badge variant={active ? 'default' : 'secondary'}>{active ? 'Clocked in now' : complete ? (s.status === 'completed' ? 'Completed' : 'Not completed') : 'Missing times'}</Badge>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <div><dt className="text-xs text-muted-foreground">Clocked in</dt><dd>{formatTime(s.clock_in)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Clocked out</dt><dd>{formatTime(s.clock_out)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Recorded hours</dt><dd>{complete ? shiftHours(s.clock_in, s.clock_out).toFixed(2) : '—'}</dd></div>
              </dl>
            </article>;
          })}
        </div>
      )}
    </details>
  );
}