import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NOTE_CATEGORIES, BEHAVIOURAL_SUBTYPES } from '@/components/notes/noteCategories';
import { formatDate } from '@/lib/format';
import MobileSelect from '@/components/mobile/MobileSelect';

export default function CareNoteDialog({ open, onOpenChange, shift, client, clientName, existing, onSaved }) {
  const [category, setCategory] = useState('general'), [subtype, setSubtype] = useState('positive'), [content, setContent] = useState('');
  const [saving, setSaving] = useState(false), [error, setError] = useState('');
  const clientId = existing?.client_id || shift?.client_id || client?.id;
  const isDraft = existing?.status === 'draft';
  useEffect(() => { if (open) { setCategory(existing?.note_category || (shift ? 'support' : 'general')); setSubtype(existing?.behavioural_subtype || 'positive'); setContent(existing?.content || ''); setError(''); } }, [open, existing, shift]);
  const close = next => { if (!saving) onOpenChange(next); };
  const save = async (event, finalize) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const { data } = await base44.functions.invoke('careNotes', { action: 'save', id: existing?.id, client_id: clientId, shift_id: shift?.id || '', note_category: category, behavioural_subtype: category === 'behavioural' ? subtype : '', content, status: isDraft && !finalize ? 'draft' : 'final' });
      await onSaved?.(data.note); onOpenChange(false);
    } catch (err) { setError(err.response?.data?.error || 'Unable to save this note. Please try again.'); }
    finally { setSaving(false); }
  };
  return <Dialog open={open} onOpenChange={close}><DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-lg grid-cols-1 max-h-[90dvh] overflow-y-auto">
    <DialogHeader><DialogTitle>{existing?.id ? 'Edit note' : 'Add note'}</DialogTitle><DialogDescription>{clientName || client?.full_name || 'Client'}{shift ? ` · ${formatDate(shift.date)}` : ''} · Temporary app storage</DialogDescription></DialogHeader>
    <form onSubmit={save} className="min-w-0 space-y-4"><fieldset disabled={saving} className="min-w-0 space-y-4">
      <div className="space-y-2"><Label htmlFor="care-note-category">Category</Label><MobileSelect id="care-note-category" value={category} onValueChange={setCategory} disabled={saving} options={NOTE_CATEGORIES.map(([value, label]) => ({ value, label }))} /></div>
      {category === 'behavioural' && <div className="space-y-2"><Label htmlFor="care-note-subtype">Behaviour type</Label><MobileSelect id="care-note-subtype" value={subtype} onValueChange={setSubtype} disabled={saving} options={BEHAVIOURAL_SUBTYPES.map(([value, label]) => ({ value, label }))} /></div>}
      <div className="space-y-2"><Label htmlFor="care-note-content">Note</Label><Textarea id="care-note-content" required maxLength={20000} rows={8} value={content} onChange={e => setContent(e.target.value)} placeholder="Record the support provided, observations and relevant outcomes." /><p className="text-xs text-muted-foreground">Written manually. Use the AI assistant to draft from a guided Q&A.</p></div>
    </fieldset>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter className="gap-2 sm:gap-0"><Button type="button" variant="outline" disabled={saving} onClick={() => close(false)}>Cancel</Button>{isDraft && <Button type="button" variant="secondary" disabled={saving || !clientId || !content.trim()} onClick={e => save(e, false)}>{saving ? 'Saving…' : 'Update draft'}</Button>}<Button type="submit" disabled={saving || !clientId || !content.trim()}>{saving ? 'Saving…' : isDraft ? 'Finalize note' : 'Save note'}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}