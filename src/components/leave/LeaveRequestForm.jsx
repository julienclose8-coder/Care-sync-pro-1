import React, { useState } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import MobileSelect from '@/components/mobile/MobileSelect';
import LeaveDateFields from '@/components/leave/LeaveDateFields';

const empty = { request_type: 'leave', all_day: true, start_date: '', end_date: '', start_time: '09:00', end_time: '17:00', reason: '' };
export default function LeaveRequestForm({ workerId, onSaved }) {
  const [value, setValue] = useState(empty), [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState(false);
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError(''); setSuccess(false);
    try {
      await api.functions.invoke('workerLeave', { action: 'submit', worker_id: workerId, ...value });
      setValue(empty); setSuccess(true); onSaved();
    } catch (err) { setError(err.response?.data?.error || 'Unable to submit your request.'); }
    finally { setBusy(false); }
  };
  return <form onSubmit={submit} className="space-y-4">
    <fieldset disabled={busy} className="space-y-4 min-w-0">
      <div className="space-y-1"><Label htmlFor="leave-type">Apply for</Label><MobileSelect id="leave-type" value={value.request_type} onValueChange={request_type => setValue({ ...value, request_type })} options={[{ value: 'leave', label: 'Leave' }, { value: 'unavailability', label: 'Unavailability' }]} /></div>
      <LeaveDateFields value={value} onChange={setValue} />
      <div className="space-y-1"><Label htmlFor="leave-reason">Reason (optional)</Label><Textarea id="leave-reason" value={value.reason} maxLength={2000} onChange={e => setValue({ ...value, reason: e.target.value })} /></div>
      <p className="text-xs text-muted-foreground">Both options require manager approval. Your roster stays unchanged while pending.</p>
      <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Submitting…' : 'Submit for approval'}</Button>
    </fieldset>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {success && <p role="status" className="text-sm text-primary">Request submitted for manager approval.</p>}
  </form>;
}