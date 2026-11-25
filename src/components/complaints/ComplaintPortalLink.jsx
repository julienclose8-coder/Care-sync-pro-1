import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function ComplaintPortalLink({ type = 'internal' }) {
  const [manager, setManager] = useState(false);
  useEffect(() => { base44.functions.invoke('complaints',{action:'access'}).then(res => setManager(res.data.can_manage)).catch(() => setManager(false)); }, []);
  return <section className="border rounded-xl bg-card p-4 space-y-3">
    <h2 className="font-heading font-semibold">Complaints and feedback</h2>
    <p className="text-sm text-muted-foreground">Raise a concern privately with HR and track your complaint’s status and resolution.</p>
    <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to={`/complaints?scope=mine&type=${type}`}>My complaints</Link></Button>{manager && <Button asChild><Link to="/complaints">HR complaints workspace</Link></Button>}</div>
  </section>;
}