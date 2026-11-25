import React from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function MobileSelect({ id, value, onValueChange, options, disabled, className, 'aria-label': ariaLabel }) {
  const empty = '__unassigned__';
  const selected = value || (options.some(option => option.value === '') ? empty : '');
  return <Select value={selected} disabled={disabled} onValueChange={next => onValueChange(next === empty ? '' : next)}>
    <SelectTrigger id={id} aria-label={ariaLabel} className={className}><SelectValue placeholder="Select an option" /></SelectTrigger>
    <SelectContent>{options.map(option => <SelectItem key={option.value || empty} value={option.value || empty}>{option.label}</SelectItem>)}</SelectContent>
  </Select>;
}