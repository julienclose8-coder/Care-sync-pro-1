import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2, Trash2 } from 'lucide-react';
import { api } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const errorText = (error, fallback) => error?.response?.data?.error || error?.message || fallback;

// The signed-in person's organisation: its details, and invitations for staff who
// don't have a worker or client record. Platform admins can also add organisations.
export default function Organisation() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-8 p-4 pb-16 md:p-8">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 font-heading text-2xl font-bold"><Building2 className="h-6 w-6 text-primary" />Organisation</h1>
        <p className="text-sm text-muted-foreground">Everyone in your organisation sees only your organisation's clients, staff and records.</p>
      </header>
      <OrganisationDetails canEdit={isAdmin && user?.is_owner} organisationId={user?.organisation_id} />
      {isAdmin && <Invitations />}
      {user?.is_platform_admin && <PlatformOrganisations />}
    </main>
  );
}

function OrganisationDetails({ canEdit, organisationId }) {
  const queryClient = useQueryClient();
  const { data: org, isPending } = useQuery({
    queryKey: ['organisation', organisationId],
    enabled: !!organisationId,
    queryFn: () => api.entities.Organisation.get(organisationId),
  });
  const [form, setForm] = useState(null);
  const save = useMutation({
    mutationFn: values => api.entities.Organisation.update(organisationId, values),
    onSuccess: () => { setForm(null); queryClient.invalidateQueries({ queryKey: ['organisation'] }); },
  });
  if (isPending) return <Loader2 className="h-5 w-5 animate-spin" />;
  if (!org) return null;
  const values = form || { name: org.name || '', abn: org.abn || '', ndis_registration_number: org.ndis_registration_number || '' };
  const set = key => e => setForm({ ...values, [key]: e.target.value });
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="font-heading text-lg font-semibold">Details</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2"><Label htmlFor="org-name">Name</Label><Input id="org-name" value={values.name} onChange={set('name')} disabled={!canEdit} /></div>
        <div className="space-y-1"><Label htmlFor="org-abn">ABN</Label><Input id="org-abn" value={values.abn} onChange={set('abn')} disabled={!canEdit} /></div>
        <div className="space-y-1"><Label htmlFor="org-ndis">NDIS registration number</Label><Input id="org-ndis" value={values.ndis_registration_number} onChange={set('ndis_registration_number')} disabled={!canEdit} /></div>
      </div>
      {canEdit ? (
        <div className="flex items-center gap-3">
          <Button disabled={!form || !values.name.trim() || save.isPending} onClick={() => save.mutate({ name: values.name.trim(), abn: values.abn.trim() || null, ndis_registration_number: values.ndis_registration_number.trim() || null })}>
            {save.isPending ? 'Saving…' : 'Save details'}
          </Button>
          {save.error && <p role="alert" className="text-sm text-destructive">{errorText(save.error, 'Unable to save.')}</p>}
        </div>
      ) : <p className="text-xs text-muted-foreground">Only the organisation's owner can change these details.</p>}
    </section>
  );
}

function Invitations() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const { data: invites = [], isPending } = useQuery({
    queryKey: ['organisation-invitations'],
    queryFn: () => api.entities.OrganisationInvitation.filter({ accepted_at: null }, '-created_date', 200),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['organisation-invitations'] });
  const invite = useMutation({
    mutationFn: () => api.entities.OrganisationInvitation.create({ email: email.trim().toLowerCase(), role, is_owner: false }),
    onSuccess: () => { setEmail(''); refresh(); },
  });
  const cancel = useMutation({ mutationFn: id => api.entities.OrganisationInvitation.delete(id), onSuccess: refresh });
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="font-heading text-lg font-semibold">Invite staff</h2>
      <p className="text-sm text-muted-foreground">
        Workers and clients join automatically when you add them with their email. Use an invitation for office staff and managers.
        They join when they sign up with this email.
      </p>
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={e => { e.preventDefault(); invite.mutate(); }}>
        <Input type="email" required aria-label="Email address" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        <select aria-label="Access" className="h-10 rounded-md border bg-background px-3 text-sm" value={role} onChange={e => setRole(e.target.value)}>
          <option value="user">Staff (worker access)</option>
          <option value="admin">Manager (admin access)</option>
        </select>
        <Button type="submit" disabled={invite.isPending}>{invite.isPending ? 'Inviting…' : 'Invite'}</Button>
      </form>
      {invite.error && <p role="alert" className="text-sm text-destructive">{errorText(invite.error, 'Unable to invite.')}</p>}
      {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : invites.length ? (
        <ul className="divide-y rounded-lg border">
          {invites.map(i => (
            <li key={i.id} className="flex items-center justify-between gap-2 p-3 text-sm">
              <span className="min-w-0 truncate">{i.email} <span className="text-muted-foreground">· {i.role === 'admin' ? 'Manager' : 'Staff'} · waiting to sign up</span></span>
              <Button variant="ghost" size="icon" aria-label={`Cancel invitation for ${i.email}`} onClick={() => cancel.mutate(i.id)}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted-foreground">No open invitations.</p>}
    </section>
  );
}

function PlatformOrganisations() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const { data, isPending, error } = useQuery({
    queryKey: ['platform-organisations'],
    queryFn: async () => (await api.functions.invoke('organisations', { action: 'list' })).data,
  });
  const create = useMutation({
    mutationFn: async () => (await api.functions.invoke('organisations', { action: 'create', name: name.trim(), admin_email: adminEmail.trim() })).data,
    onSuccess: () => { setName(''); setAdminEmail(''); queryClient.invalidateQueries({ queryKey: ['platform-organisations'] }); },
  });
  return (
    <section className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <h2 className="font-heading text-lg font-semibold">All organisations (platform admin)</h2>
      <p className="text-sm text-muted-foreground">Add a care agency as a new customer. Their first admin becomes its owner when they sign up with this email.</p>
      <form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={e => { e.preventDefault(); create.mutate(); }}>
        <Input required aria-label="Organisation name" placeholder="Organisation name" value={name} onChange={e => setName(e.target.value)} />
        <Input required type="email" aria-label="First admin email" placeholder="First admin email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
        <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Adding…' : 'Add organisation'}</Button>
      </form>
      {create.error && <p role="alert" className="text-sm text-destructive">{errorText(create.error, 'Unable to add the organisation.')}</p>}
      {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : error ? <p role="alert" className="text-sm text-destructive">{errorText(error, 'Unable to load organisations.')}</p> : (
        <ul className="divide-y rounded-lg border bg-card">
          {data.organisations.map(org => (
            <li key={org.id} className="p-3 text-sm">
              <p className="font-medium">{org.name}</p>
              <p className="text-muted-foreground">{org.accounts} account{org.accounts === 1 ? '' : 's'}{org.pending_invites.length ? ` · invited: ${org.pending_invites.map(i => i.email).join(', ')}` : ''}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
