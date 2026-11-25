import React, { useState } from 'react';
import { useIsMutating, useQuery } from '@tanstack/react-query';
import useOptimisticStaffAccess, { staffMutationKey } from '@/hooks/useOptimisticStaffAccess';
import useAdminViewState from '@/hooks/useAdminViewState';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck } from 'lucide-react';
import StaffLevelCatalog from '@/components/access/StaffLevelCatalog';
import StaffLevelRow from '@/components/access/StaffLevelRow';
import MobileSelect from '@/components/mobile/MobileSelect';
import RoleActivationPanel from '@/components/access/RoleActivationPanel';

export default function StaffAccessSection() {
  const [subjectType, setSubjectType] = useAdminViewState('staff:subject-type', 'user');
  const [offset, setOffset] = useAdminViewState('staff:offset', 0);
  const mutation = useOptimisticStaffAccess();
  const saving = useIsMutating({ mutationKey: staffMutationKey });
  const [message, setMessage] = useState('');
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['staff-access', subjectType, offset],
    enabled: saving === 0,
    queryFn: async () => (await api.functions.invoke('staffAccess', { action: 'list', subject_type: subjectType, offset })).data,
  });
  const change = async (subjectId, action, level) => {
    setMessage('');
    await mutation.mutateAsync({ subjectType, offset, subjectId, action, level });
    setMessage(action === 'clear' ? 'Assignment and any pay exception cleared.' : 'Role saved. Care and financial portal access are unchanged.');
  };
  return (
    <div className="space-y-6 pb-12">
      <header className="space-y-2"><h1 className="font-heading text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6 shrink-0 text-primary" />Staff access levels</h1><p className="text-sm text-muted-foreground">Twelve access levels · CEO and Operations activation controls</p></header>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2"><h2 className="font-semibold text-sm">Role setup stage</h2><p className="text-sm text-muted-foreground">Registered accounts assigned CEO or Operation assessment can manage role settings now. Only CEOs assign levels and decide individual Operations worker-pay exceptions. Scoped portals, team restrictions and task handoffs are the next stage: existing care and financial access do not change here. Profile-only assignments never grant login access.</p></div>
      {isPending ? <div role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-5 w-5 animate-spin" />Loading staff access…</div> : error ? <div role="alert" className="space-y-2"><p className="text-sm text-destructive">{error.response?.data?.error || 'Unable to load staff access.'}</p><Button variant="outline" onClick={() => refetch()}>Try again</Button></div> : data && <>
        {data.can_activate && <RoleActivationPanel levels={data.levels} routing={data.routing} canActivate={data.can_activate} />}
        {data.can_manage ? <section aria-label="Staff assignments" className="space-y-3">
          <h2 className="font-heading font-semibold text-lg">Assign planned levels</h2>
          <label className="block text-sm space-y-2"><span>Staff list</span><MobileSelect aria-label="Staff list" disabled={saving > 0} value={subjectType} onValueChange={value => { setSubjectType(value); setOffset(0); setMessage(''); }} options={[{ value: 'user', label: 'Registered accounts' }, { value: 'worker', label: 'Worker profiles' }]} /></label>
          <p className="text-xs text-muted-foreground">Accounts and worker profiles are separate records. Profile assignments do not create a login or grant account access.</p>
          {message && <p role="status" className="text-sm text-primary">{message}</p>}
          {data.rows.length ? data.rows.map(person => <StaffLevelRow key={`${subjectType}-${person.id}`} person={person} levels={data.levels} onChange={change} subjectType={subjectType} />) : <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No {subjectType === 'worker' ? 'worker profiles' : 'accounts'} on this page.</p>}
          <div className="flex items-center justify-between gap-2"><Button variant="outline" disabled={saving > 0 || offset === 0} onClick={() => setOffset(offset - 25)}>Previous</Button><span className="text-xs text-muted-foreground">Page {offset / 25 + 1}</span><Button variant="outline" disabled={saving > 0 || !data.has_more} onClick={() => setOffset(offset + 25)}>Next</Button></div>
        </section> : <p className="rounded-xl border p-4 text-sm text-muted-foreground">Only CEOs can view and change staff assignments and individual pay exceptions. Operations can manage activation settings above.</p>}
        <StaffLevelCatalog levels={data.levels} />
      </>}
    </div>
  );
}