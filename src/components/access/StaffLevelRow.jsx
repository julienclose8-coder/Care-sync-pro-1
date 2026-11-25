import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import MobileSelect from '@/components/mobile/MobileSelect';
import WorkerPayVisibility from '@/components/access/WorkerPayVisibility';

export default function StaffLevelRow({ person, levels, onChange, subjectType }) {
  const [level, setLevel] = useState(person.level);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setLevel(person.level); }, [person.level]);
  const submit = async (action) => {
    setBusy(true); setError('');
    try { await onChange(person.id, action, level); }
    catch (err) { setError(err.response?.data?.error || 'Unable to save this assignment. Please try again.'); }
    finally { setBusy(false); }
  };
  return (
    <article data-staff-id={person.id} className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex flex-wrap justify-between gap-2">
        <div className="min-w-0"><h3 className="font-semibold break-words">{person.name}</h3><p className="text-sm text-muted-foreground break-all">{person.email}</p></div>
        {person.is_ceo && <Badge className="self-start">Current CEO · Level 12</Badge>}
      </div>
      <p className="text-xs text-muted-foreground">Current access: {person.current_access} (unchanged)</p>
      {person.is_ceo ? <p className="text-sm text-muted-foreground">The primary CEO designation is protected. CEOs manage assignments and individual pay exceptions; CEO and Operations manage activation settings.</p> : (
        <div className="space-y-2">
          <Label htmlFor={`level-${person.id}`}>Planned level</Label>
          <div className="flex flex-wrap gap-2">
            <MobileSelect id={`level-${person.id}`} value={level || ''} disabled={busy} onValueChange={setLevel} className="min-w-0 w-full sm:flex-1 sm:w-auto" options={[{ value: '', label: 'Unassigned' }, ...levels.map(l => ({ value: l.id, label: `${l.id === 'whs' ? '' : `${l.id} — `}${l.name}` }))]} />
            <Button disabled={busy || !level || (level === person.level && !person.needs_confirmation)} onClick={() => submit('save')}>{busy ? 'Saving…' : 'Save level'}</Button>
            {person.assignment_id && <Button variant="outline" disabled={busy} onClick={() => submit('clear')}>Clear assignment</Button>}
          </div>
          <p className="text-xs text-muted-foreground">{person.needs_confirmation ? 'Previous role translated to the new numbering; save to confirm.' : person.level ? `${levels.find(item => item.id === person.level)?.portal || ''} portal planned. Care and financial access stay unchanged.` : 'No planned assignment yet.'}</p>
          {person.level === '11' && person.assignment_id !== 'pending' && !person.needs_confirmation && <WorkerPayVisibility person={person} subjectType={subjectType} />}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </article>
  );
}