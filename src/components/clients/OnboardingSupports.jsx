import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ClientSettingOptions from '@/components/clients/ClientSettingOptions';

export default function OnboardingSupports({ form, onChange }) {
  return <div className="space-y-4">
    <h3 className="font-semibold">Where will support take place? *</h3>
    <ClientSettingOptions form={form} onChange={onChange} />
    <div className="space-y-1.5"><Label htmlFor="onboard-service">What type of support is needed? *</Label><Input id="onboard-service" required value={form.service_type} onChange={e => onChange({ service_type: e.target.value })} placeholder="e.g. Personal Care or Community Access" /></div>
    <div className="space-y-1.5"><Label htmlFor="onboard-needs">What are the client’s support needs? *</Label><Textarea id="onboard-needs" required value={form.support_needs} onChange={e => onChange({ support_needs: e.target.value })} placeholder="Care, mobility, communication and safety requirements" /></div>
    <div className="space-y-1.5"><Label htmlFor="onboard-preferences">What routines or preferences should staff know?</Label><Textarea id="onboard-preferences" value={form.preferences} onChange={e => onChange({ preferences: e.target.value })} /></div>
  </div>;
}