import React from 'react';
import { Label } from '@/components/ui/label';
import MobileSelect from '@/components/mobile/MobileSelect';

export default function ComplaintFilters({ filters, onChange }) {
  const fields = [
    ['complaint_type','Type',['internal','external']],
    ['status','Status',['received','acknowledged','investigating','resolved','closed']],
    ['priority','Priority',['low','normal','high','urgent']]
  ];
  return <div className="grid sm:grid-cols-3 gap-3">{fields.map(([key,label,options]) => <div key={key} className="space-y-1"><Label htmlFor={`filter-${key}`}>{label}</Label><MobileSelect id={`filter-${key}`} value={filters[key]} onValueChange={value => onChange(key,value)} options={[{ value: '', label: `All ${label.toLowerCase()}s` }, ...options.map(value => ({ value, label: value[0].toUpperCase()+value.slice(1) }))]} /></div>)}</div>;
}