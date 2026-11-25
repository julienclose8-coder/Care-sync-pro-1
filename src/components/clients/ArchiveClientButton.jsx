import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function ArchiveClientButton({ client, onSaved }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const archive = async () => {
    setBusy(true); setError('');
    try {
      await base44.entities.Client.update(client.id, { status: 'inactive', archived_at: new Date().toISOString(), archive_reason: reason.trim() });
      await onSaved(); setOpen(false);
    } catch (err) { setError(err.message || 'Unable to archive the client.'); }
    finally { setBusy(false); }
  };
  if (client.status === 'inactive') return <span className="self-center text-sm text-muted-foreground">Inactive profile{client.archived_at ? ` · Archived ${new Date(client.archived_at).toLocaleDateString()}` : ''}</span>;
  return <>
    <Button variant="outline" onClick={() => { setReason(''); setError(''); setOpen(true); }}>Archive profile</Button>
    <Dialog open={open} onOpenChange={value => !busy && setOpen(value)}><DialogContent>
      <DialogHeader><DialogTitle>Archive {client.full_name}?</DialogTitle><DialogDescription>This marks the profile inactive only. Existing shifts, invoices, notes and other records are preserved. Future shifts are not cancelled.</DialogDescription></DialogHeader>
      <div className="space-y-2"><Label htmlFor="archive-reason">Offboarding reason (optional)</Label><Textarea id="archive-reason" value={reason} onChange={e => setReason(e.target.value)} /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button disabled={busy} onClick={archive}>{busy ? 'Archiving…' : 'Confirm archive'}</Button></DialogFooter>
    </DialogContent></Dialog>
  </>;
}