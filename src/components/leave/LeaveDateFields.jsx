import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function LeaveDateFields({ value, onChange }) {
  const set = (key, next) => onChange({ ...value, [key]: next });
  return <div className="space-y-3">
    <div className="flex items-center gap-2"><Checkbox id="leave-all-day" checked={value.all_day} onCheckedChange={checked => set('all_day', !!checked)} /><Label htmlFor="leave-all-day">Whole days</Label></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1"><Label htmlFor="leave-start">Start date</Label><Input id="leave-start" type="date" required value={value.start_date} onChange={e => set('start_date', e.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="leave-end">End date</Label><Input id="leave-end" type="date" required min={value.start_date} value={value.end_date} onChange={e => set('end_date', e.target.value)} /></div>
      {!value.all_day && <>
        <div className="space-y-1"><Label htmlFor="leave-start-time">Start time</Label><Input id="leave-start-time" type="time" required value={value.start_time} onChange={e => set('start_time', e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor="leave-end-time">End time</Label><Input id="leave-end-time" type="time" required value={value.end_time} onChange={e => set('end_time', e.target.value)} /></div>
      </>}
    </div>
    <p className="text-xs text-muted-foreground">{value.all_day ? 'Includes the whole start and end days.' : 'One continuous period from the start date and time to the end date and time. Times use the roster’s Sydney time.'}</p>
  </div>;
}