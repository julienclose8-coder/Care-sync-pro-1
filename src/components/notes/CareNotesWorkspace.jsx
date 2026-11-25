import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import CareNoteDialog from '@/components/notes/CareNoteDialog';
import AiNoteAssistantDialog from '@/components/notes/AiNoteAssistantDialog';
import CareNoteList from '@/components/notes/CareNoteList';
import { NOTE_CATEGORIES } from '@/components/notes/noteCategories';
import { Sparkles } from 'lucide-react';
import MobileSelect from '@/components/mobile/MobileSelect';

export default function CareNotesWorkspace({ clientId, clientName }) {
  const cache = useQueryClient();
  const [category, setCategory] = useState('all'), [form, setForm] = useState(null), [assistant, setAssistant] = useState(null), [remove, setRemove] = useState(null);
  const [deleting, setDeleting] = useState(false), [deleteError, setDeleteError] = useState('');
  const query = useQuery({ queryKey: ['care-notes', clientId], enabled: !!clientId, queryFn: async () => (await api.functions.invoke('careNotes', { action: 'list', client_id: clientId })).data });
  const refresh = () => cache.invalidateQueries({ queryKey: ['care-notes'] });
  useEffect(() => api.entities.CareNote.subscribe(() => { cache.invalidateQueries({ queryKey: ['care-notes'] }); }), [cache]);
  const deleteNote = async () => {
    setDeleting(true); setDeleteError('');
    try { await api.functions.invoke('careNotes', { action: 'delete', id: remove.id }); await refresh(); setRemove(null); }
    catch (err) { setDeleteError(err.response?.data?.error || 'Unable to delete this note.'); }
    finally { setDeleting(false); }
  };
  if (!clientId) return <p className="text-sm text-muted-foreground">Select a client to view notes.</p>;
  return <section className="min-w-0 space-y-4" data-care-notes-workspace>
    <div className="flex flex-wrap items-end justify-between gap-3"><div className="space-y-1.5"><Label htmlFor={`care-category-filter-${clientId}`}>Filter by category</Label><MobileSelect id={`care-category-filter-${clientId}`} aria-label="Filter notes by category" value={category} onValueChange={setCategory} options={[{ value: 'all', label: 'All categories' }, ...NOTE_CATEGORIES.map(([value, label]) => ({ value, label }))]} /></div><div className="flex gap-2"><Button variant="outline" disabled={!query.data} onClick={() => setAssistant({})}><Sparkles className="mr-1 h-4 w-4" />AI note</Button><Button disabled={!query.data} onClick={() => setForm({})}>Add note</Button></div></div>
    <p className="text-xs text-muted-foreground">AI assistant drafts notes from a guided Q&A · stored in app storage.</p>
    {query.isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading notes…</p> : query.isError ? <div role="alert" className="space-y-2"><p className="text-sm text-destructive">{query.error.response?.data?.error || 'Unable to load notes.'}</p><Button variant="outline" onClick={() => query.refetch()}>Try again</Button></div> : <CareNoteList notes={(query.data?.notes || []).filter(n => category === 'all' || n.note_category === category)} onEdit={setForm} onDelete={note => { setRemove(note); setDeleteError(''); }} />}
    {query.data?.limited && <p className="text-xs text-muted-foreground">Showing the latest 200 client notes.</p>}
    <CareNoteDialog open={!!form} onOpenChange={open => !open && setForm(null)} client={{ id: clientId, full_name: clientName || query.data?.client_name }} existing={form?.id ? form : null} onSaved={refresh} />
    <AiNoteAssistantDialog open={!!assistant} onOpenChange={open => !open && setAssistant(null)} client={{ id: clientId, full_name: clientName || query.data?.client_name }} onSaved={refresh} />
    <Dialog open={!!remove} onOpenChange={open => !open && !deleting && setRemove(null)}><DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-md"><DialogHeader><DialogTitle>Delete this note?</DialogTitle><DialogDescription>This removes the note from temporary app storage.</DialogDescription></DialogHeader>{deleteError && <p role="alert" className="text-sm text-destructive">{deleteError}</p>}<DialogFooter className="gap-2 sm:gap-0"><Button variant="outline" disabled={deleting} onClick={() => setRemove(null)}>Cancel</Button><Button variant="destructive" disabled={deleting} onClick={deleteNote}>{deleting ? 'Deleting…' : 'Delete permanently'}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}