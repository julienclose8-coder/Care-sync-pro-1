import { useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AdminViewStateContext } from '@/components/admin/AdminViewStateProvider';

export default function useAdminTabHistory(items, ready) {
  const location = useLocation(), navigate = useNavigate();
  const store = useContext(AdminViewStateContext);
  const requested = location.state?.adminTab || new URLSearchParams(location.search).get('tab');
  const section = items.some(item => item.id === requested && !['storage', 'complaints'].includes(item.id)) ? requested : 'overview';
  useEffect(() => {
    if (!ready || !store) return;
    const key = `scroll:${section}`, top = store.values.get(key) || 0;
    const frame = requestAnimationFrame(() => window.scrollTo({ top, behavior: 'instant' }));
    const remember = () => store.values.set(key, window.scrollY);
    window.addEventListener('scroll', remember, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', remember); };
  }, [section, ready, store]);
  const setSection = id => {
    if (id === section) return;
    store?.values.set(`scroll:${section}`, window.scrollY);
    const search = new URLSearchParams(location.search);
    search.delete('tab');
    navigate({ pathname: '/', search: search.toString() }, { state: { ...location.state, adminTab: id } });
  };
  return { section, setSection };
}