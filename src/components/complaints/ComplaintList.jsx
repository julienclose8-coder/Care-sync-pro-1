import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function ComplaintList({ records, onOpen }) {
  const today = new Date().toLocaleDateString('en-CA');
  if (!records.length) return <p className="border border-dashed rounded-xl p-8 text-center text-muted-foreground">No complaints match these filters.</p>;
  return <div className="space-y-3">{records.map(record => {
    const overdue = record.follow_up_date && record.follow_up_date < today && !['resolved','closed'].includes(record.status);
    return <article key={record.id} data-complaint-id={record.id} className="border rounded-xl bg-card p-4 space-y-3">
      <div className="flex flex-wrap justify-between items-start gap-3"><div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">{record.reference} · {record.received_date}</p><h2 className="font-heading font-semibold break-words">{record.title}</h2></div><Button variant="outline" onClick={() => onOpen(record)}>Open complaint</Button></div>
      <div className="flex flex-wrap gap-2"><Badge variant="outline">{record.complaint_type}</Badge><Badge>{record.status}</Badge><Badge variant="secondary">{record.priority} priority</Badge>{overdue && <Badge variant="destructive">Follow-up overdue</Badge>}</div>
      <p className="text-sm text-muted-foreground break-words">{record.complainant_name} · {record.category.replaceAll('_',' ')}{record.assigned_handler ? ` · Handler: ${record.assigned_handler}` : ''}{record.follow_up_date ? ` · Follow-up: ${record.follow_up_date}` : ''}</p>
    </article>;
  })}</div>;
}