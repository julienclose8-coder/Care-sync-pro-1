import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Switch } from '@/components/ui/switch';

export default function RoleActivationPanel({ levels, routing, canActivate }) {
  const cache = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ level, active }) => (await base44.functions.invoke('staffAccess', { action: 'activation', level, active })).data,
    onSuccess: () => cache.invalidateQueries({ queryKey: ['staff-access'] }),
  });
  return <section aria-label="Role activation settings" className="space-y-4 rounded-xl border bg-card p-4">
    <div><h2 className="font-heading font-semibold text-lg">Role activation settings</h2><p className="text-sm text-muted-foreground">CEO and Operation assessment control these settings. They determine the responsibility plan for the upcoming scoped portals; they do not yet change access to care or financial records.</p></div>
    <div className="grid gap-3 sm:grid-cols-2">{levels.filter(role => !role.fixed).map(role => <div key={role.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <label htmlFor={`activate-role-${role.id}`} className="text-sm"><span className="font-medium">Level {role.id} · {role.name}</span><span className="block text-xs text-muted-foreground">{role.active ? 'Active in responsibility plan' : 'Inactive in responsibility plan'}</span></label>
      <Switch id={`activate-role-${role.id}`} aria-label={`Activate ${role.name}`} checked={role.active} disabled={!canActivate || mutation.isPending} onCheckedChange={active => mutation.mutate({ level: role.id, active })} />
    </div>)}</div>
    {mutation.isPending && <p role="status" className="text-sm text-muted-foreground">Saving activation setting…</p>}
    {mutation.isError && <p role="alert" className="text-sm text-destructive">{mutation.error.response?.data?.error || 'Unable to save activation setting.'}</p>}
    <div className="space-y-3 border-t pt-4"><h3 className="font-semibold">Responsibility handoffs</h3>{routing.map(item => <div key={item.key} data-routing={item.key}><p className="text-sm"><strong>{item.title}:</strong> {item.receiver}</p><p className="text-xs text-muted-foreground">{item.detail}</p></div>)}</div>
  </section>;
}