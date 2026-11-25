import { useCallback, useContext, useState, useSyncExternalStore } from 'react';
import { AdminViewStateContext } from '@/components/admin/AdminViewStateProvider';

export default function useAdminViewState(key, initial) {
  const shared = useContext(AdminViewStateContext);
  const [local] = useState(() => ({ values: new Map(), listeners: new Set() }));
  const [fallback] = useState(initial);
  const store = shared || local;
  const snapshot = useCallback(() => store.values.has(key) ? store.values.get(key) : fallback, [store, key, fallback]);
  const subscribe = useCallback(listener => {
    store.listeners.add(listener);
    return () => store.listeners.delete(listener);
  }, [store]);
  const value = useSyncExternalStore(subscribe, snapshot, snapshot);
  const setValue = useCallback(next => {
    store.values.set(key, typeof next === 'function' ? next(snapshot()) : next);
    store.listeners.forEach(listener => listener());
  }, [store, key, snapshot]);
  return [value, setValue];
}