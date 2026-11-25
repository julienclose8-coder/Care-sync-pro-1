import React from 'react';
import { formatCurrency as currency } from '@/lib/format';
import { SUPPORT_SETTINGS } from '@/lib/supportSettings';

export default function OnboardingReview({ form }) {
  const entries = [
    ['Client', form.full_name], ['Email', form.email], ['Phone', form.phone], ['Date of birth', form.date_of_birth], ['Address', form.address], ['Emergency contact', form.emergency_contact], ['Funding', form.funding_type], ['Plan manager', form.plan_manager],
    ['Support setting', SUPPORT_SETTINGS[form.support_setting]], ['Centre', form.centre_name], ['Centre address', form.centre_address], ['Support type', form.service_type], ['Support needs', form.support_needs], ['Preferences', form.preferences],
    ['In-home request choices', form.setting_supports?.in_home?.filter(Boolean).join(', ')], ['Centre-based request choices', form.setting_supports?.centre_based?.filter(Boolean).join(', ')],
    ['Weekly hours', form.weekly_hours], ['Quoted hourly rate', currency(Number(form.quoted_hourly_rate))], ['Weekly estimate', currency(Number(form.weekly_hours) * Number(form.quoted_hourly_rate))], ['Quotation conditions', form.quotation_notes], ['Required documents', form.documents_text],
  ];
  return <div className="space-y-4"><p className="text-sm text-muted-foreground">Review before saving. Use Back to make corrections; no client is created until you finish.</p><dl className="space-y-3">{entries.map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-sm whitespace-pre-wrap break-words">{value === '' || value == null ? 'Not specified' : value}</dd></div>)}</dl></div>;
}