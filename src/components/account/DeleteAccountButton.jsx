import React, { useState } from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';

export default function DeleteAccountButton({ className }) {
  const [open, setOpen] = useState(false), [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const remove = async () => {
    setBusy(true); setError('');
    try { await api.functions.invoke('deleteOwnAccount', { confirmation }); await api.auth.logout('/'); }
    catch (err) { setError(err.response?.data?.error || 'Unable to delete your account. Please try again.'); setBusy(false); }
  };
  return <>
    <Button type="button" variant="ghost" className={className || 'text-destructive'} onClick={() => { setConfirmation(''); setError(''); setOpen(true); }}>Delete account</Button>
    <AlertDialog open={open} onOpenChange={next => !busy && setOpen(next)}>
      <AlertDialogContent className="max-h-[85dvh] overflow-y-auto">
        <AlertDialogHeader><AlertDialogTitle>Delete your account permanently?</AlertDialogTitle><AlertDialogDescription>Your signed-in account profile will be removed and you will lose access to this app. This cannot be undone. Care, roster, payroll and complaint records are retained by the organisation for its operational and legal obligations. This does not delete the organisation’s app or cancel subscriptions. Admins should ensure another administrator can manage the app before continuing.</AlertDialogDescription></AlertDialogHeader>
        <div className="space-y-2"><Label htmlFor="delete-account-confirmation">Type DELETE to confirm</Label><Input id="delete-account-confirmation" value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} autoComplete="off" /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>Keep account</AlertDialogCancel><Button type="button" variant="destructive" disabled={busy || confirmation !== 'DELETE'} onClick={remove}>{busy ? 'Deleting…' : 'Delete permanently'}</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}