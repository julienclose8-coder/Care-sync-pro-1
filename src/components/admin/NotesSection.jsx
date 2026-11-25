import React from 'react';
import useAdminViewState from '@/hooks/useAdminViewState';
import { Label } from '@/components/ui/label';
import CareNotesWorkspace from '@/components/notes/CareNotesWorkspace';
import MobileSelect from '@/components/mobile/MobileSelect';

export default function NotesSection({ data }) {
  const [clientId, setClientId] = useAdminViewState('notes:client', data.clients[0]?.id || '');
  const client = data.clients.find(c => c.id === clientId) || data.clients[0];
  return <div className="min-w-0 space-y-5"><div><h1 className="font-heading text-2xl font-extrabold">Client notes</h1><p className="text-sm text-muted-foreground">Manually written notes, organised by client and category.</p></div>
    {data.clients.length ? <><div className="max-w-md space-y-2"><Label htmlFor="notes-client">Client</Label><MobileSelect id="notes-client" value={client?.id || ''} onValueChange={setClientId} options={data.clients.map(c => ({ value: c.id, label: c.full_name }))} /></div><CareNotesWorkspace key={client.id} clientId={client.id} clientName={client.full_name} /></> : <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Add a client before writing notes.</p>}
  </div>;
}