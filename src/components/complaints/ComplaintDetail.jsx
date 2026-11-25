import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import ComplaintReview from '@/components/complaints/ComplaintReview';

export default function ComplaintDetail({ record, manager, onClose, onSaved }) {
  const item = (label, value) => <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-sm whitespace-pre-wrap break-words">{value || 'Not provided'}</dd></div>;
  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle className="break-words">{record.title}</DialogTitle><DialogDescription>{record.reference} · Received {record.received_date}</DialogDescription></DialogHeader>
        <div className="flex flex-wrap gap-2"><Badge variant="outline">{record.complaint_type}</Badge><Badge>{record.status}</Badge><Badge variant="secondary">{record.priority} priority</Badge></div>
        <dl className="grid sm:grid-cols-2 gap-3">
          {item('Complainant',record.complainant_name)}{item('Submitting as',record.relationship)}{item('Category',record.category.replaceAll('_',' '))}{item('Received via',record.received_via)}{item('Contact details',record.contact_details)}{item('Incident date',record.incident_date)}{item('Follow-up date',record.follow_up_date)}{item('Resolved at',record.resolved_at ? new Date(record.resolved_at).toLocaleString() : '')}
          <div className="sm:col-span-2">{item('What happened?',record.description)}</div><div className="sm:col-span-2">{item('Desired outcome',record.desired_outcome)}</div>
          {!manager && <div className="sm:col-span-2">{item('Resolution',record.resolution)}</div>}
        </dl>
        {manager && <ComplaintReview key={record.id} record={record} onSaved={onSaved} />}
        {manager && <section className="border-t pt-4 space-y-2"><h3 className="font-heading font-semibold">Activity history</h3>{(record.activity || []).map((a,i) => <p key={i} className="text-xs text-muted-foreground break-words">{new Date(a.at).toLocaleString()} · {a.by}: {a.text}</p>)}</section>}
      </DialogContent>
    </Dialog>
  );
}