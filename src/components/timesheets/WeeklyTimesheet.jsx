import React, { useState } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { shiftHours, formatDate } from '@/lib/format';
import TimesheetRow from '@/components/timesheets/TimesheetRow';
import CorrectionDialog from '@/components/timesheets/CorrectionDialog';
import NoteDialog from '@/components/notes/CareNoteDialog';

export default function WeeklyTimesheet({ data, onChanged }) {
  const [week, setWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [correct, setCorrect] = useState(null);
  const [note, setNote] = useState(null);
  const start = format(week, 'yyyy-MM-dd'), end = format(addDays(week, 6), 'yyyy-MM-dd');
  const shifts = data.shifts.filter(s => s.date >= start && s.date <= end).sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
  const hours = shifts.filter(s => s.status !== 'cancelled' && s.clock_in && s.clock_out).reduce((sum, s) => sum + shiftHours(s.clock_in, s.clock_out), 0);
  const clients = Object.fromEntries(data.clients.map(c => [c.id, c]));
  const notes = Object.fromEntries([...data.notes].reverse().filter(n => n.shift_id).map(n => [n.shift_id, n]));
  return <div className="space-y-5">
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex flex-wrap justify-between gap-2"><h2 className="font-heading font-bold">{formatDate(start)} – {formatDate(end)}, {format(week, 'yyyy')}</h2><p className="font-semibold">{hours.toFixed(2)} recorded hours</p></div>
      <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setWeek(addDays(week, -7))}>Previous week</Button><Button size="sm" variant="outline" onClick={() => setWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}>This week</Button><Button size="sm" variant="outline" onClick={() => setWeek(addDays(week, 7))}>Next week</Button></div>
      <p className="text-xs text-muted-foreground">Monday–Sunday · Totals include recorded clock-in and clock-out times only, not scheduled hours or pending corrections.</p>
    </div>
    {shifts.length ? shifts.map(shift => <TimesheetRow key={shift.id} shift={shift} client={clients[shift.client_id]} correction={data.corrections.find(c => c.shift_id === shift.id)} onCorrect={() => setCorrect(shift)} onNote={() => setNote(shift)} />) : <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">No supports in this week.</p>}
    <CorrectionDialog shift={correct} onClose={() => setCorrect(null)} onSaved={onChanged} />
    <NoteDialog open={!!note} onOpenChange={open => !open && setNote(null)} shift={note} client={clients[note?.client_id]} clientName={clients[note?.client_id]?.full_name || ''} existing={notes[note?.id]} user={data.worker} onSaved={onChanged} />
  </div>;
}