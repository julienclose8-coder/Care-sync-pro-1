import { createContext, useContext, useEffect, useRef, useState } from 'react';

export const PageRefreshContext = createContext(null);
export function usePageRefresh(callback) {
  const register = useContext(PageRefreshContext);
  const latest = useRef(callback);
  latest.current = callback;
  useEffect(() => register?.(latest), [register]);
}

export default function usePullToRefresh(refresh, enabled = true, targetRef) {
  const latest = useRef(refresh), busy = useRef(false);
  latest.current = refresh;
  const [distance, setDistance] = useState(0), [refreshing, setRefreshing] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    if (!enabled) return;
    let start = null, drag = 0;
    const atTop = target => {
      if (window.scrollY > 0 || document.scrollingElement?.scrollTop > 0) return false;
      for (let el = target; el && el !== document.body; el = el.parentElement) if (el.scrollTop > 0) return false;
      return true;
    };
    const begin = event => {
      start = null; drag = 0;
      if ((!targetRef && event.target.closest('[data-pull-to-refresh]')) || busy.current || event.touches.length !== 1 || !atTop(event.target) || event.target.closest('button,a,input,textarea,select,[role="dialog"],[role="alertdialog"],[role="listbox"],[role="combobox"],[role="slider"],[contenteditable="true"],nav')) return;
      const touch = event.touches[0]; start = { x: touch.clientX, y: touch.clientY }; setError('');
    };
    const move = event => {
      if (!start || event.touches.length !== 1) return;
      const touch = event.touches[0], dy = touch.clientY - start.y;
      if (Math.abs(touch.clientX - start.x) > 30 || dy < 0 || !atTop(event.target)) { start = null; drag = 0; setDistance(0); return; }
      drag = Math.min(dy / 2, 100); setDistance(drag);
      if (drag > 5 && event.cancelable) event.preventDefault();
    };
    const end = async () => {
      const ready = !!start && drag >= 60; start = null; drag = 0; setDistance(0);
      if (!ready || busy.current) return;
      busy.current = true; setRefreshing(true);
      try { await latest.current(); } catch { setError('Unable to refresh. Pull down to try again.'); }
      finally { busy.current = false; setRefreshing(false); }
    };
    const cancel = () => { start = null; drag = 0; setDistance(0); };
    const target = targetRef?.current || document;
    target.addEventListener('touchstart', begin, { passive: true });
    target.addEventListener('touchmove', move, { passive: false });
    target.addEventListener('touchend', end); target.addEventListener('touchcancel', cancel);
    return () => { target.removeEventListener('touchstart', begin); target.removeEventListener('touchmove', move); target.removeEventListener('touchend', end); target.removeEventListener('touchcancel', cancel); };
  }, [enabled, targetRef]);
  return { distance, refreshing, error };
}