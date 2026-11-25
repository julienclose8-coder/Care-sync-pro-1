import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import MobileSelect from '@/components/mobile/MobileSelect';

export default function ComplaintReview({ record, onSaved }) {
  const [form, setForm] = useState({ status:record.status, priority:record.priority, assigned_handler:record.assigned_handler || '', follow_up_date:record.follow_up_date || '', internal_notes:record.internal_notes || '', resolution:record.resolution || '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const update = (key, value) => setForm(f => ({...f,[key]:value}));
  const save = async e => {
    e.preventDefault(); setBusy(true); setError('');
    try { const {data} = await base44.functions.invoke('complaints', {action:'update', id:record.id, ...form}); onSaved(data.record); }
    catch (err) { setError(err.response?.data?.error || 'Unable to save the review.'); }
    finally { setBusy(false); }
  };
  return (
    <form onSubmit={save} className="border-t pt-4 space-y-4">
      <h3 className="font-heading font-semibold">HR review</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1"><Label htmlFor="review-status">Status</Label><MobileSelect id="review-status" value={form.status} onValueChange={value => update('status',value)} options={['received','acknowledged','investigating','resolved','closed'].map(value => ({ value, label: value[0].toUpperCase()+value.slice(1) }))} /></div>
        <div className="space-y-1"><Label htmlFor="review-priority">Priority</Label><MobileSelect id="review-priority" value={form.priority} onValueChange={value => update('priority',value)} options={['low','normal','high','urgent'].map(value => ({ value, label: value[0].toUpperCase()+value.slice(1) }))} /></div>
        <div className="space-y-1"><Label htmlFor="review-handler">Assigned handler</Label><Input id="review-handler" maxLength={160} value={form.assigned_handler} onChange={e => update('assigned_handler',e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor="review-followup">Follow-up date</Label><Input id="review-followup" type="date" value={form.follow_up_date} onChange={e => update('follow_up_date',e.target.value)} /></div>
      </div>
      <div className="space-y-1"><Label htmlFor="review-notes">Internal HR notes (not visible to the submitter)</Label><Textarea id="review-notes" maxLength={10000} rows={4} value={form.internal_notes} onChange={e => update('internal_notes',e.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="review-resolution">Resolution (visible to the submitter)</Label><Textarea id="review-resolution" maxLength={5000} required={['resolved','closed'].includes(form.status)} value={form.resolution} onChange={e => update('resolution',e.target.value)} /></div>
      {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
      <Button disabled={busy} type="submit">{busy ? 'Saving…' : 'Save review'}</Button>
    </form>
  );
}