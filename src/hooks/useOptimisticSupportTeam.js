import { useEffect, useRef, useState } from 'react';
import { api } from '@/api/client';

export default function useOptimisticSupportTeam(clientId, onChanged, onAdded) {
  const [team, setTeam] = useState(null);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const loadTeam = () => api.entities.SupportTeamMember.filter({ client_id: clientId }).then(setTeam).catch(() => setTeam([]));
  useEffect(() => { loadTeam(); }, [clientId]);
  const addMember = async workerId => {
    if (busy.current || !team || team.some(member => member.worker_id === workerId)) return;
    busy.current = true; setError('');
    const draft = { id: `pending-${crypto.randomUUID()}`, client_id: clientId, worker_id: workerId, status: 'pending', _saving: true };
    setTeam(current => [...current, draft]); onAdded();
    try {
      const saved = await api.entities.SupportTeamMember.create({ client_id: clientId, worker_id: workerId, status: 'pending' });
      setTeam(current => current.map(member => member.id === draft.id ? saved : member));
    } catch {
      setTeam(current => current.filter(member => member.id !== draft.id));
      setError('Unable to add this worker. The unsaved member was removed; please try again.');
    } finally { busy.current = false; }
  };
  const approve = async member => {
    if (busy.current) return;
    busy.current = true; setError('');
    setTeam(current => current.map(item => item.id === member.id ? { ...item, status: 'approved', _saving: true } : item));
    try {
      const saved = await api.entities.SupportTeamMember.update(member.id, { status: 'approved' });
      setTeam(current => current.map(item => item.id === member.id ? { ...item, ...saved, _saving: false } : item));
    } catch {
      setTeam(current => current.map(item => item.id === member.id ? member : item));
      setError('Unable to approve this worker. Their previous approval status was restored.');
      return;
    } finally { busy.current = false; }
    if (onChanged) {
      try { await onChanged(); }
      catch { setError('Approval saved, but the client details could not refresh. Reload to try again.'); }
    }
  };
  return { team, error, loadTeam, addMember, approve, saving: !!team?.some(member => member._saving) };
}