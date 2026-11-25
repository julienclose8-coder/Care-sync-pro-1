import { useContext } from 'react';
import { AdminViewStateContext } from '@/components/admin/AdminViewStateProvider';

const ROOT_KEYS = {
  clients: ['clients:search'],
  roster: ['roster:filter', 'roster:view', 'roster:week'],
  workers: ['workers:viewing'],
  notes: ['notes:client'],
  policies: ['policy:expanded'],
  procedures: ['procedure:expanded'],
  'staff-access': ['staff:subject-type', 'staff:offset'],
};

export default function useResetAdminTab(onReselect) {
  const store = useContext(AdminViewStateContext);
  return section => {
    ROOT_KEYS[section]?.forEach(key => store?.values.delete(key));
    store?.values.set(`scroll:${section}`, 0);
    store?.listeners.forEach(listener => listener());
    onReselect?.();
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  };
}