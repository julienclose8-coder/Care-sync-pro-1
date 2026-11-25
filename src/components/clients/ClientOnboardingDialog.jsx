import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { settingDefaults, settingPayload } from '@/lib/supportSettings';
import OnboardingIdentity from '@/components/clients/OnboardingIdentity';
import OnboardingSupports from '@/components/clients/OnboardingSupports';
import OnboardingQuotation from '@/components/clients/OnboardingQuotation';
import OnboardingReview from '@/components/clients/OnboardingReview';
const steps = ['Client details', 'Support needs', 'Quotation & documents', 'Review'];
const defaults = { full_name: '', email: '', phone: '', address: '', date_of_birth: '', emergency_contact: '', funding_type: 'NDIS', plan_manager: '', support_needs: '', preferences: '', service_type: '', weekly_hours: '', quoted_hourly_rate: '', quotation_notes: '', documents_text: '', setting_supports: {} };

export default function ClientOnboardingDialog({ open, onOpenChange, initial, onSaved }) {
  const [form, setForm] = useState(defaults), [step, setStep] = useState(0), [saving, setSaving] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    const values = Object.fromEntries(Object.keys(defaults).map(key => [key, initial?.[key] ?? defaults[key]]));
    setForm({ ...values, ...settingDefaults(initial), ...initial?.onboarding, documents_text: (initial?.onboarding?.required_documents || []).join('\n') }); setStep(0); setError('');
  }, [open, initial]);
  const change = patch => setForm(prev => ({ ...prev, ...patch }));
  const submit = async e => {
    e.preventDefault(); setError('');
    if (step === 0 && !form.full_name.trim()) return setError('Enter the client’s full name.');
    if (step === 1 && (!form.support_setting || !form.service_type.trim() || !form.support_needs.trim())) return setError('Choose a support setting and describe the support type and needs.');
    if (step < 3) return setStep(step + 1);
    setSaving(true);
    try {
      const identity = Object.fromEntries(['full_name', 'email', 'phone', 'address', 'date_of_birth', 'emergency_contact', 'funding_type', 'plan_manager', 'support_needs', 'preferences'].map(key => [key, form[key].trim()]));
      if (!identity.email) delete identity.email; if (!identity.date_of_birth) delete identity.date_of_birth;
      const hours = Number(form.weekly_hours), rate = Number(form.quoted_hourly_rate);
      const onboarding = { service_type: form.service_type.trim(), weekly_hours: hours, quoted_hourly_rate: rate, weekly_estimate: Math.round(hours * rate * 100) / 100, quotation_notes: form.quotation_notes.trim(), required_documents: [...new Set(form.documents_text.split('\n').map(s => s.trim()).filter(Boolean))], completed_at: initial?.onboarding?.completed_at || new Date().toISOString() };
      const payload = { ...identity, ...settingPayload(form), onboarding };
      if (initial?.id) await api.entities.Client.update(initial.id, payload); else await api.entities.Client.create({ ...payload, status: 'active' });
      onOpenChange(false); await onSaved();
    } catch (err) { setError(err.message || 'Unable to save onboarding.'); }
    finally { setSaving(false); }
  };
  return <Dialog open={open} onOpenChange={value => !saving && onOpenChange(value)}><DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-xl grid-cols-1 max-h-[90dvh] overflow-y-auto">
    <DialogHeader><DialogTitle>{initial?.id ? 'Edit client onboarding' : 'New client onboarding'}</DialogTitle><DialogDescription>Staff-led · Step {step + 1} of 4: {steps[step]}</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="min-w-0 space-y-4"><fieldset disabled={saving} className="min-w-0 space-y-4">
      {step === 0 && <OnboardingIdentity form={form} onChange={change} />}{step === 1 && <OnboardingSupports form={form} onChange={change} />}{step === 2 && <OnboardingQuotation form={form} onChange={change} />}{step === 3 && <OnboardingReview form={form} />}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter className="gap-2 sm:gap-0"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>{step > 0 && <Button type="button" variant="outline" onClick={() => { setStep(step - 1); setError(''); }}>Back</Button>}<Button type="submit">{saving ? 'Saving…' : step === 3 ? 'Finish onboarding' : 'Next'}</Button></DialogFooter>
    </fieldset></form>
  </DialogContent></Dialog>;
}