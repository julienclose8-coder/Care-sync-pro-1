import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ComplaintFields from '@/components/complaints/ComplaintFields';

export default function ComplaintForm({ manager, initialType, onClose, onSaved }) {
  const [form, setForm] = useState({ title:'', description:'', complaint_type:initialType || 'internal', category:'other', priority:'normal', relationship:initialType === 'external' ? 'client' : 'worker', incident_date:'', desired_outcome:'', complainant_name:'', contact_details:'', received_via:'app' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async e => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const { data } = await base44.functions.invoke('complaints', { action:'create', ...form });
      onSaved(data.record); onClose();
    } catch (err) { setError(err.response?.data?.error || 'Unable to submit your complaint. Please try again.'); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={value => !value && !busy && onClose()}>
      <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>{manager ? 'Record a complaint' : 'Submit a complaint'}</DialogTitle><DialogDescription>HR, admins, and the CEO can review your complaint. You can track its status and resolution here. For immediate danger, contact emergency services.</DialogDescription></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <ComplaintFields form={form} setForm={setForm} manager={manager} />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit complaint'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}