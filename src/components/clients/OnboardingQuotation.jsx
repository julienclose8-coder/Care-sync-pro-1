import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency as currency } from '@/lib/format';

export default function OnboardingQuotation({ form, onChange }) {
  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">Record an estimated weekly quotation. This does not create an invoice or change billing rates.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      {[['weekly_hours', 'Estimated support hours per week *'], ['quoted_hourly_rate', 'Quoted hourly rate (AUD) *']].map(([key, label]) => <div key={key} className="space-y-1.5"><Label htmlFor={`onboard-${key}`}>{label}</Label><Input id={`onboard-${key}`} type="number" min="0" max="100000" step="0.01" required value={form[key]} onChange={e => onChange({ [key]: e.target.value })} /></div>)}
    </div>
    <p className="rounded-lg border bg-muted p-3 font-semibold">Weekly estimate: {currency(Number(form.weekly_hours) * Number(form.quoted_hourly_rate))}</p>
    <div className="space-y-1.5"><Label htmlFor="onboard-quote-notes">Quotation inclusions or conditions</Label><Textarea id="onboard-quote-notes" value={form.quotation_notes} onChange={e => onChange({ quotation_notes: e.target.value })} placeholder="Describe inclusions, additional costs or conditions" /></div>
    <div className="space-y-1.5"><Label htmlFor="onboard-documents">Which documents are required?</Label><Textarea id="onboard-documents" rows={4} value={form.documents_text} onChange={e => onChange({ documents_text: e.target.value })} placeholder="One document per line, e.g. service agreement, support plan" /><p className="text-xs text-muted-foreground">This records requirements only, not uploaded documents or confirmation they have been received.</p></div>
  </div>;
}