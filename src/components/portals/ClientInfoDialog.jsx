import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CareNotesWorkspace from '@/components/notes/CareNotesWorkspace';

export default function ClientInfoDialog({ client, onOpenChange }) {
  return <Dialog open={!!client} onOpenChange={open => !open && onOpenChange(false)}><DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-lg grid-cols-1 max-h-[90dvh] overflow-y-auto">{client && <>
    <DialogHeader><DialogTitle>{client.full_name}</DialogTitle></DialogHeader>
    <dl className="space-y-3 rounded-lg border bg-muted/30 p-4">{[['Phone', client.phone], ['Address', client.address], ['Funding', client.funding_type], ['Support needs', client.support_needs], ['Preferences', client.preferences], ['Emergency contact', client.emergency_contact]].filter(([, value]) => value).map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="whitespace-pre-wrap break-words text-sm">{value}</dd></div>)}</dl>
    <h2 className="font-heading font-semibold">Client notes</h2><CareNotesWorkspace key={client.id} clientId={client.id} clientName={client.full_name} />
  </>}</DialogContent></Dialog>;
}