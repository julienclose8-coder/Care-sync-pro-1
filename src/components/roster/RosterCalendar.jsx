import React from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useAdminViewState from '@/hooks/useAdminViewState';
import useRosterCalendar from '@/hooks/useRosterCalendar';
import RosterCalendarHeader from '@/components/roster/RosterCalendarHeader';
import RosterStaffRow from '@/components/roster/RosterStaffRow';

export default function RosterCalendar({ workers = [], status = 'all', clientName, onEdit, onChanged }) {
  const [weekStart, setWeekStart] = useAdminViewState('roster:week', () => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const roster = useRosterCalendar(weekStart, status, onChanged);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const names = new Map(workers.filter(worker => worker.role !== 'admin').map(worker => [worker.id, worker]));
  roster.shifts.forEach(shift => { if (shift.worker_id && !names.has(shift.worker_id)) names.set(shift.worker_id, { id: shift.worker_id, full_name: shift.worker_name || 'Assigned worker' }); });
  const rows = [{ id: '', full_name: 'Unassigned' }, ...Array.from(names.values()).sort((a, b) => (a.full_name || a.email || '').localeCompare(b.full_name || b.email || ''))];
  return <div className="min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm" data-testid="roster-calendar">
    <RosterCalendarHeader weekStart={weekStart} onWeekChange={setWeekStart} moving={roster.moving} />
    {roster.message && <p role={roster.message.error ? 'alert' : 'status'} className={`border-b px-4 py-3 text-sm ${roster.message.error ? 'bg-destructive/5 text-destructive' : 'bg-primary/5 text-primary'}`}>{roster.message.text}</p>}
    {roster.isPending ? <p className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading roster…</p> : roster.error ? <div role="alert" className="space-y-3 p-5 text-sm text-destructive"><p>Unable to load this week’s shifts.</p><Button variant="outline" onClick={() => roster.refetch()}>Try again</Button></div> : <>
      {!roster.shifts.length && <p className="border-b bg-muted/30 px-4 py-3 text-sm text-muted-foreground">No {status === 'all' ? '' : `${status} `}shifts this week. Use Manage shifts or Add shift to start your roster.</p>}
      <DragDropContext onDragEnd={roster.move}>
        <div className="max-h-[38rem] overflow-auto overscroll-contain" tabIndex={0} aria-label="Weekly staff calendar, scroll to see all days and staff">
          <div className="min-w-[66rem]">
            <div className="sticky top-0 z-20 grid grid-cols-[10rem_repeat(7,minmax(8rem,1fr))] border-b bg-card">
              <div className="sticky left-0 z-30 border-r bg-card p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Staff / day</div>
              {days.map(day => <div key={format(day, 'yyyy-MM-dd')} className={`border-r px-2 py-3 text-center last:border-r-0 ${isSameDay(day, new Date()) ? 'bg-primary/10 text-primary' : 'text-foreground'}`}><p className="text-xs">{format(day, 'EEE')}</p><p className="text-sm font-bold">{format(day, 'd MMM')}{isSameDay(day, new Date()) ? ' · Today' : ''}</p></div>)}
            </div>
            {rows.map(worker => <RosterStaffRow key={worker.id} worker={worker} days={days} shifts={roster.shifts} clientName={clientName} onEdit={onEdit} moving={roster.moving} onChanged={onChanged} />)}
          </div>
        </div>
      </DragDropContext>
      {roster.hasNextPage && <div className="border-t p-3 text-center"><Button variant="outline" disabled={roster.isFetchingNextPage} onClick={() => roster.fetchNextPage()}>{roster.isFetchingNextPage ? 'Loading…' : 'Load more shifts'}</Button></div>}
      {roster.moving && <p role="status" className="flex items-center gap-2 border-t px-4 py-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Saving shift…</p>}
    </>}
  </div>;
}