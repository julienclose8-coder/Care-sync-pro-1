import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MobileSelect from '@/components/mobile/MobileSelect';

export default function OnboardingIdentity({ form, onChange }) {
  const fields = [['full_name', 'What is the client’s full name? *', 'text'], ['email', 'Email', 'email'], ['phone', 'Phone', 'tel'], ['date_of_birth', 'Date of birth', 'date'], ['address', 'Home address', 'text'], ['emergency_contact', 'Emergency contact name and phone', 'text'], ['plan_manager', 'Who manages their plan?', 'text']];
  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">Staff complete these questions with the client. Only the full name is required here.</p>
    {fields.map(([key, label, type]) => <div key={key} className="space-y-1.5"><Label htmlFor={`onboard-${key}`}>{label}</Label><Input id={`onboard-${key}`} type={type} required={key === 'full_name'} value={form[key]} onChange={e => onChange({ [key]: e.target.value })} /></div>)}
    <div className="space-y-1.5"><Label htmlFor="onboard-funding">How is their support funded?</Label><MobileSelect id="onboard-funding" value={form.funding_type} onValueChange={value => onChange({ funding_type: value })} options={['NDIS', 'Home Care Package', 'Private', 'Other'].map(value => ({ value, label: value }))} /></div>
  </div>;
}