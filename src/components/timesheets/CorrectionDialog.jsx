import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/format';

export default function CorrectionDialog({ shift, onClose, onSaved }) {
  const [times, setTimes] = useState({ clock_in: '', clock_out: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setTimes({ clock_in: shift?.clock_in || '', clock_out: shift?.clock_out || '', reason: '' }); setError(''); }, [shift]);
  const submit = async event => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await base44.functions.invoke('workerTimesheet', { action: 'submit', shift_id: shift.id, ...times });
      await onSaved(); onClose();
    } catch (err) { setError(err.response?.data?.error || 'Unable to submit your correction. Please try again.'); }
    finally { setSaving(false); }
  };
  return <Dialog open={!!shift} onOpenChange={open => !open && !saving && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto">
    <DialogHeader><DialogTitle>Request time correction</DialogTitle><DialogDescription>{formatDate(shift?.date)} · Your recorded times stay unchanged until an admin approves.</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">{[['clock_in', 'Correct clock-in'], ['clock_out', 'Correct clock-out']].map(([key, label]) => <div key={key} className="space-y-1"><Label htmlFor={key}>{label}</Label><Input id={key} type="time" required value={times[key]} onChange={e => setTimes({ ...times, [key]: e.target.value })} /></div>)}</div>
      <p className="text-xs text-muted-foreground">If clock-out is earlier than clock-in, it counts as finishing the following day.</p>
      <div className="space-y-1"><Label htmlFor="correction-reason">Reason for correction</Label><Textarea id="correction-reason" required maxLength={2000} placeholder="For example, I forgot to clock in." value={times.reason} onChange={e => setTimes({ ...times, reason: e.target.value })} /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button><Button disabled={saving || !times.reason.trim()}>{saving ? 'Submitting…' : 'Submit for approval'}</Button></div>
    </form>
  </DialogContent></Dialog>;
}