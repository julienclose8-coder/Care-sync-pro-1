import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Switch } from '@/components/ui/switch';

export default function WorkerPayVisibility({ person, subjectType }) {
  const cache = useQueryClient();
  const mutation = useMutation({
    mutationFn: async visible => (await base44.functions.invoke('staffAccess', { action: 'pay_visibility', subject_type: subjectType, subject_id: person.id, visible })).data,
    onSuccess: () => cache.invalidateQueries({ queryKey: ['staff-access'] }),
  });
  return <div className="space-y-2 border-t pt-3">
    <div className="flex items-center justify-between gap-3"><label htmlFor={`worker-pay-${person.id}`} className="text-sm font-medium">Allow worker-pay visibility when HR is inactive</label><Switch id={`worker-pay-${person.id}`} aria-label={`Allow worker pay for ${person.name}`} checked={!!person.worker_pay_visible} disabled={mutation.isPending} onCheckedChange={value => mutation.mutate(value)} /></div>
    <p className="text-xs text-muted-foreground">CEO-only decision for this person, saved for the scoped Operations portal. This does not include client finances or payroll control.{subjectType === 'worker' ? ' A worker-profile assignment does not grant account access.' : ''}</p>
    {mutation.isPending && <p role="status" className="text-xs text-muted-foreground">Saving pay visibility…</p>}
    {mutation.isError && <p role="alert" className="text-sm text-destructive">{mutation.error.response?.data?.error || 'Unable to save pay visibility.'}</p>}
  </div>;
}