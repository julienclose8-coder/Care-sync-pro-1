import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency as currency } from '@/lib/format';
import ClientOnboardingDialog from '@/components/clients/ClientOnboardingDialog';

export default function ClientOnboardingCard({ client, onSaved }) {
  const [open, setOpen] = useState(false);
  const details = client.onboarding;
  return <Card>
    <CardHeader><CardTitle className="text-base">Onboarding & quotation</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      {details ? <>
        <p className="text-xs text-muted-foreground">Completed {new Date(details.completed_at).toLocaleDateString()} · Staff-led</p>
        <dl className="grid gap-3 sm:grid-cols-2">{[['Support type', details.service_type], ['Weekly hours', details.weekly_hours], ['Quoted hourly rate (AUD)', currency(details.quoted_hourly_rate)], ['Weekly estimate (AUD)', currency(details.weekly_estimate)], ['Quotation conditions', details.quotation_notes || 'Not specified']].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-sm whitespace-pre-wrap break-words">{value}</dd></div>)}</dl>
        <div><h3 className="text-sm font-semibold">Required documents</h3>{details.required_documents?.length ? <ul className="list-disc pl-5 text-sm space-y-1">{details.required_documents.map(doc => <li key={doc} className="break-words">{doc}</li>)}</ul> : <p className="text-sm text-muted-foreground">None specified.</p>}<p className="text-xs text-muted-foreground mt-2">Requirements only; receipt has not been confirmed. The quotation is an estimate, not an invoice.</p></div>
      </> : <p className="text-sm text-muted-foreground">No onboarding questionnaire has been saved for this client yet.</p>}
      {client.status === 'inactive' && client.archived_at && <div className="border-t pt-3"><h3 className="text-sm font-semibold">Archived profile</h3><p className="text-sm whitespace-pre-wrap">{client.archive_reason || 'No reason provided.'}</p><p className="text-xs text-muted-foreground">Existing records and shifts are preserved.</p></div>}
      <Button variant="outline" onClick={() => setOpen(true)}>{details ? 'Edit onboarding' : 'Complete onboarding'}</Button>
      <ClientOnboardingDialog open={open} onOpenChange={setOpen} initial={client} onSaved={onSaved} />
    </CardContent>
  </Card>;
}