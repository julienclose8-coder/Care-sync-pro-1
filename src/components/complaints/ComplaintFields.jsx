import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import MobileSelect from '@/components/mobile/MobileSelect';

export default function ComplaintFields({ form, setForm, manager }) {
  const field = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const select = (key, title, options) => <div className="space-y-1"><Label htmlFor={`complaint-${key}`}>{title}</Label><MobileSelect id={`complaint-${key}`} value={form[key]} onValueChange={value => field(key, value)} options={options.map(([value, label]) => ({ value, label }))} /></div>;
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        {manager && select('complaint_type', 'Complaint type', [['internal','Internal'],['external','External']])}
        {select('relationship', 'Submitting as', [['worker','Worker'],['client','Client'],['caregiver','Caregiver / family'],['other','Other']])}
        {select('category', 'Category', [['service','Service quality'],['staff_conduct','Staff conduct'],['safety','Safety'],['billing','Billing'],['privacy','Privacy'],['other','Other']])}
        {select('priority', 'Priority', [['low','Low'],['normal','Normal'],['high','High'],['urgent','Urgent']])}
      </div>
      {manager && <div className="space-y-1"><Label htmlFor="complaint-name">Complainant name</Label><Input id="complaint-name" value={form.complainant_name} maxLength={160} onChange={e => field('complainant_name',e.target.value)} /></div>}
      <div className="space-y-1"><Label htmlFor="complaint-contact">Contact details (optional)</Label><Input id="complaint-contact" value={form.contact_details} maxLength={300} onChange={e => field('contact_details',e.target.value)} /></div>
      {manager && select('received_via', 'Received via', [['app','App'],['phone','Phone'],['email','Email'],['in_person','In person'],['other','Other']])}
      <div className="space-y-1"><Label htmlFor="complaint-title">Title</Label><Input id="complaint-title" required maxLength={160} value={form.title} onChange={e => field('title',e.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="complaint-description">What happened?</Label><Textarea id="complaint-description" required maxLength={10000} rows={4} value={form.description} onChange={e => field('description',e.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="complaint-incident">Incident date (optional)</Label><Input id="complaint-incident" type="date" value={form.incident_date} onChange={e => field('incident_date',e.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="complaint-outcome">Desired outcome (optional)</Label><Textarea id="complaint-outcome" maxLength={3000} value={form.desired_outcome} onChange={e => field('desired_outcome',e.target.value)} /></div>
    </div>
  );
}