import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export const staffMutationKey = ['staff-access-change'];
export default function useOptimisticStaffAccess() {
  const cache = useQueryClient();
  const updateRow = (key, id, update) => cache.setQueryData(key, current => current && ({ ...current, rows: current.rows.map(row => row.id === id ? update(row) : row) }));
  return useMutation({
    mutationKey: staffMutationKey,
    mutationFn: async ({ subjectType, subjectId, action, level }) => (await api.functions.invoke('staffAccess', { action, subject_type: subjectType, subject_id: subjectId, level })).data,
    onMutate: async ({ subjectType, offset, subjectId, action, level }) => {
      const key = ['staff-access', subjectType, offset];
      await cache.cancelQueries({ queryKey: key, exact: true });
      const previous = cache.getQueryData(key)?.rows.find(row => row.id === subjectId);
      updateRow(key, subjectId, row => ({ ...row, level: action === 'clear' ? '' : level, worker_pay_visible: action !== 'clear' && level === '11' && row.worker_pay_visible, assignment_id: action === 'clear' ? null : row.assignment_id || 'pending' }));
      return { key, previous };
    },
    onError: (_error, { subjectId }, context) => {
      if (context?.previous) updateRow(context.key, subjectId, () => context.previous);
    },
    onSuccess: (saved, { subjectId, action }, context) => {
      updateRow(context.key, subjectId, row => ({ ...row, level: action === 'clear' ? '' : saved.level, assignment_id: action === 'clear' ? null : saved.assignment_id, worker_pay_visible: saved.worker_pay_visible || false, needs_confirmation: false }));
    },
    onSettled: () => {
      if (cache.isMutating({ mutationKey: staffMutationKey }) === 1) return cache.invalidateQueries({ queryKey: ['staff-access'] });
    },
  });
}