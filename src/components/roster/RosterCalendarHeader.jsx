import React from 'react';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addDays, format, startOfWeek } from 'date-fns';

export default function RosterCalendarHeader({ weekStart, onWeekChange, moving }) {
  return <div className="space-y-2 border-b p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="font-heading font-bold">Staff roster</p><p className="text-sm text-muted-foreground" data-roster-week>{format(weekStart, 'd MMM')} – {format(addDays(weekStart, 6), 'd MMM yyyy')}</p></div>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" aria-label="Previous week" disabled={moving} onClick={() => onWeekChange(addDays(weekStart, -7))}><ChevronLeft className="h-4 w-4" /></Button>
        <Button size="sm" variant="outline" disabled={moving} onClick={() => onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }))}>This week</Button>
        <Button size="icon" variant="ghost" aria-label="Next week" disabled={moving} onClick={() => onWeekChange(addDays(weekStart, 7))}><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground"><GripVertical className="h-4 w-4 shrink-0" />Drag a shift’s grip to another day or staff row. Times stay the same; only this occurrence moves. Keyboard: Space, arrows, Space. On phones, scroll sideways or use Edit.</p>
    <p className="text-xs text-muted-foreground">Grey shifts are locked from seven days before support. Managers can change them; affected workers receive an acknowledgement request in their portal.</p>
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground"><span className="border-l-4 border-roster-ready pl-2">Green · ready</span><span className="border-l-4 border-destructive pl-2">Red · needs worker</span><span className="border-l-4 border-border bg-muted pl-2">Grey · locked / awaiting acknowledgement</span></div>
  </div>;
}