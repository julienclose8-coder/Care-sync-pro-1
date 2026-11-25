import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { categoryLabel } from '@/components/notes/noteCategories';

export default function CareNoteList({ notes, onEdit, onDelete }) {
  if (!notes.length) return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No notes in this category yet.</p>;
  return <div className="space-y-3">{notes.map(note => <article key={note.id} data-care-note-id={note.id} className="min-w-0 rounded-lg border bg-card p-4 space-y-3">
    <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><Badge variant="secondary">{categoryLabel(note.note_category)}{note.behavioural_subtype ? ` · ${note.behavioural_subtype === 'positive' ? 'Positive' : 'Negative'}` : ''}</Badge>{note.status === 'draft' && <Badge variant="outline" className="ml-1 border-amber-400 text-amber-700">Draft</Badge>}{note.note_category === 'locked_concern' && <Badge variant="outline" className="ml-1 border-red-300 text-red-700">Private</Badge>}<p className="mt-2 break-words text-xs text-muted-foreground">{note.author_name} · {new Date(note.created_date).toLocaleString('en-AU')}{note.shift_id ? ' · Linked to support' : ''}</p></div>
      {note.can_manage && <div className="flex gap-1"><Button size="sm" variant="ghost" aria-label="Edit note" onClick={() => onEdit(note)}>Edit</Button><Button size="sm" variant="ghost" aria-label="Delete note" onClick={() => onDelete(note)}>Delete</Button></div>}
    </div><p className="whitespace-pre-wrap break-words text-sm">{note.content}</p>
  </article>)}</div>;
}