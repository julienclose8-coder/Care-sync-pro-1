import { useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { toast } from '@/components/ui/use-toast';
import useAdminViewState from '@/hooks/useAdminViewState';

export default function useOptimisticRosterStatus(records, onChanged) {
  const cache = useQueryClient();
  const [overrides, setOverrides] = useAdminViewState('roster:status-overrides', {});
  const locks = useRef(new Set());
  const clear = id => setOverrides(current => { const next = { ...current }; delete next[id]; return next; });
  const setStatus = async (shift, status) => {
    if (locks.current.has(shift.id) || overrides[shift.id]?.pending) return;
    locks.current.add(shift.id);
    setOverrides(current => ({ ...current, [shift.id]: { status, pending: true } }));
    try {
      await api.functions.invoke('saveRosterShifts', { shift_id: shift.id, changes: { status } });
    } catch (error) {
      clear(shift.id); locks.current.delete(shift.id);
      toast({ variant: 'destructive', title: 'Shift not updated', description: error.response?.data?.error || 'The previous status was restored. Please try again.' });
      return;
    }
    setOverrides(current => ({ ...current, [shift.id]: { status, pending: false } }));
    try { await Promise.all([onChanged(), cache.invalidateQueries({ queryKey: ['roster-calendar'] })]); clear(shift.id); }
    catch { toast({ variant: 'destructive', title: 'Status saved', description: 'The roster could not refresh. Pull to refresh to reload it.' }); }
    finally { locks.current.delete(shift.id); }
  };
  return { shifts: records.map(shift => overrides[shift.id] ? { ...shift, status: overrides[shift.id].status } : shift), pending: id => !!overrides[id]?.pending, setStatus };
}