import React, { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { Loader2, ArrowDown } from 'lucide-react';
import usePullToRefresh, { PageRefreshContext } from '@/hooks/usePullToRefresh';

export default function PageRefreshProvider({ children }) {
  const callbacks = useRef(new Map()), cache = useQueryClient();
  const { pathname } = useLocation();
  const register = useCallback(ref => { const key = Symbol(); callbacks.current.set(key, ref); return () => callbacks.current.delete(key); }, []);
  const refresh = () => Promise.all([...callbacks.current.values()].map(ref => ref.current()).concat(cache.invalidateQueries({ refetchType: 'active' })));
  const { distance, refreshing, error } = usePullToRefresh(refresh, !['/login', '/register', '/forgot-password', '/reset-password'].includes(pathname));
  return <PageRefreshContext.Provider value={register}>
    {(distance > 5 || refreshing || error) && <div role="status" aria-live="polite" className="fixed top-14 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-b-lg border bg-background px-4 py-3 text-sm text-foreground shadow pointer-events-none">
      {refreshing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowDown className="h-5 w-5" />}
      {refreshing ? 'Refreshing…' : error || (distance >= 60 ? 'Release to refresh' : 'Pull to refresh')}
    </div>}
    {children}
  </PageRefreshContext.Provider>;
}