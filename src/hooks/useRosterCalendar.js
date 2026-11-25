import { useRef, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import { base44 } from '@/api/base44Client';

export default function useRosterCalendar(weekStart, status, onChanged) {
  const cache = useQueryClient(), locked = useRef(false);
  const [moving, setMoving] = useState(false), [patch, setPatch] = useState(null), [message, setMessage] = useState(null);
  const from = format(weekStart, 'yyyy-MM-dd'), to = format(addDays(weekStart, 6), 'yyyy-MM-dd');
  const query = useInfiniteQuery({
    queryKey: ['roster-calendar', from, to, status], initialPageParam: null,
    queryFn: ({ pageParam }) => base44.entities.Shift.filter({ date: { $gte: from, $lte: to }, ...(status === 'all' ? {} : { status }) }, { sort: 'start_time', limit: 100, cursor: pageParam || undefined }),
    getNextPageParam: page => page.has_more ? page.next_cursor : undefined,
  });
  const shifts = (query.data?.pages.flatMap(page => page.items) || []).map(shift => patch?.id === shift.id ? { ...shift, ...patch } : shift);
  const move = async result => {
    if (!result.destination || locked.current) return;
    const shift = shifts.find(item => item.id === result.draggableId);
    const [date, worker_id] = JSON.parse(result.destination.droppableId);
    if (!shift || (shift.date === date && (shift.worker_id || '') === worker_id)) return;
    locked.current = true; setMoving(true); setMessage(null); setPatch({ id: shift.id, date, worker_id });
    let saved = false;
    try {
      const response = await base44.functions.invoke('moveRosterShift', { shift_id: shift.id, date, worker_id, expected_updated_at: shift.updated_date });
      saved = true;
      setMessage({ text: `Shift moved to ${format(new Date(`${date}T00:00:00`), 'EEE d MMM')} · ${response.data.shift.worker_name || 'Unassigned'}. Times unchanged. ${response.data.warning || ''}`, error: false });
      await Promise.all([cache.invalidateQueries({ queryKey: ['roster-calendar'] }), onChanged?.()]);
    } catch (error) {
      setMessage({ text: saved ? 'Shift saved, but the roster could not refresh. Refresh to reload it.' : error.response?.data?.error || error.message || 'Shift not moved. Its previous assignment was restored.', error: true });
    } finally {
      setPatch(null); setMoving(false); locked.current = false;
    }
  };
  return { ...query, shifts, moving, message, move };
}