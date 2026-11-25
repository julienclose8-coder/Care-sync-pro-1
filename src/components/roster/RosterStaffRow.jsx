import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { format } from 'date-fns';
import RosterShiftCard from '@/components/roster/RosterShiftCard';

export default function RosterStaffRow({ worker, days, shifts, clientName, onEdit, moving, onChanged }) {
  return <div className="grid grid-cols-[10rem_repeat(7,minmax(8rem,1fr))] border-b last:border-b-0">
    <div className="sticky left-0 z-10 border-r bg-card p-3"><p className={`break-words text-sm font-semibold ${worker.id ? '' : 'text-destructive'}`}>{worker.full_name || worker.email}</p><p className="mt-1 text-xs text-muted-foreground">{worker.id ? 'Support worker' : 'Drop here to unassign'}</p></div>
    {days.map(day => {
      const date = format(day, 'yyyy-MM-dd');
      const items = shifts.filter(shift => shift.date === date && (shift.worker_id || '') === worker.id).sort((a, b) => a.start_time.localeCompare(b.start_time) || a.id.localeCompare(b.id));
      return <Droppable key={date} droppableId={JSON.stringify([date, worker.id])} isDropDisabled={moving}>
        {(provided, snapshot) => <div ref={provided.innerRef} {...provided.droppableProps} data-roster-date={date} data-roster-worker={worker.id} aria-label={`${worker.full_name || worker.email}, ${format(day, 'EEEE d MMM')}`} className={`min-h-28 min-w-0 space-y-2 border-r p-2 last:border-r-0 ${snapshot.isDraggingOver ? 'bg-primary/10 ring-2 ring-inset ring-primary' : 'bg-background/40'}`}>
          {items.map((shift, index) => <RosterShiftCard key={shift.id} shift={shift} index={index} clientName={clientName} onEdit={onEdit} moving={moving} onChanged={onChanged} />)}
          {provided.placeholder}
          {!items.length && <p className="py-3 text-center text-xs text-muted-foreground">{snapshot.isDraggingOver ? 'Drop shift here' : '—'}</p>}
        </div>}
      </Droppable>;
    })}
  </div>;
}