import React, { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { GripVertical, History, LockKeyhole, Pencil, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/format';
import SupportLocationSummary from '@/components/supports/SupportLocationSummary';
import { rosterState } from '@/lib/rosterState';
import ShiftHistoryDialog from '@/components/roster/ShiftHistoryDialog';
import ReplacementDialog from '@/components/roster/ReplacementDialog';

export default function RosterShiftCard({ shift, index, clientName, onEdit, moving, onChanged }) {
  const { closed: locked, frozen, needsReplacement, label, colour } = rosterState(shift);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [replacementOpen, setReplacementOpen] = useState(false);
  return <Draggable draggableId={shift.id} index={index} isDragDisabled={locked || moving} disableInteractiveElementBlocking>
    {(provided, snapshot) => <article ref={provided.innerRef} {...provided.draggableProps} data-calendar-shift={shift.id} className={`rounded-lg border border-l-4 p-2 text-xs shadow-sm ${colour} ${snapshot.isDragging ? 'ring-2 ring-primary shadow-lg' : ''}`}>
      <div className="flex items-center justify-between gap-1">
        <p className="font-semibold leading-snug">{formatTime(shift.start_time)}<br />– {formatTime(shift.end_time)}</p>
        {locked ? <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Shift locked" /> : <button type="button" {...provided.dragHandleProps} aria-label={`Move shift for ${clientName(shift.client_id)} on ${shift.date}`} className="shrink-0 cursor-grab rounded p-1 text-muted-foreground hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:cursor-grabbing"><GripVertical className="h-4 w-4" /></button>}
      </div>
      <p className="mt-2 break-words font-semibold">{clientName(shift.client_id)}</p>
      <p className="mt-1 break-words text-muted-foreground">{shift.service_type || 'Support'}</p>
      <SupportLocationSummary record={shift} showAddress={false} />
      <p className={`mt-1 flex items-start gap-1 font-medium ${needsReplacement ? 'text-destructive' : !shift.worker_id && !locked ? 'text-destructive' : 'text-muted-foreground'}`} data-roster-state>{frozen && !locked && <LockKeyhole className="mt-0.5 h-3 w-3 shrink-0" aria-label="Seven-day roster lock" />}<span className="min-w-0 break-words">{label}</span></p>
      {needsReplacement && shift.replacement_reason && <p className="mt-1 break-words text-muted-foreground" data-replacement-reason>{shift.replacement_reason}</p>}
      <div className="mt-1 flex items-center gap-1 flex-wrap">
        {needsReplacement && <Button size="sm" variant="ghost" disabled={moving} className="h-7 px-1.5 text-xs text-primary" aria-label={`Find cover for ${clientName(shift.client_id)} on ${shift.date}`} onClick={() => setReplacementOpen(true)}><UserCheck className="mr-1 h-3 w-3" />Find cover</Button>}
        <Button size="sm" variant="ghost" disabled={moving} className="h-7 px-1.5 text-xs" aria-label={`Edit shift for ${clientName(shift.client_id)} on ${shift.date}`} onClick={() => onEdit(shift)}><Pencil className="mr-1 h-3 w-3" />Edit</Button>
        <Button size="sm" variant="ghost" disabled={moving} className="h-7 px-1.5 text-xs" aria-label={`History for shift for ${clientName(shift.client_id)} on ${shift.date}`} onClick={() => setHistoryOpen(true)}><History className="mr-1 h-3 w-3" />Log</Button>
      </div>
      <ShiftHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} shift={shift} clientName={clientName(shift.client_id)} />
      <ReplacementDialog open={replacementOpen} onOpenChange={setReplacementOpen} shift={shift} clientName={clientName(shift.client_id)} onChanged={onChanged} />
    </article>}
  </Draggable>;
}