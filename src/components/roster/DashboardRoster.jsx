import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import RosterCalendar from '@/components/roster/RosterCalendar';
import ShiftForm from '@/components/roster/ShiftForm';

export default function DashboardRoster({ data, onChanged, onNavigate }) {
  const [editing, setEditing] = useState(null);
  const cache = useQueryClient();
  const refresh = async () => { await Promise.all([onChanged(), cache.invalidateQueries({ queryKey: ['roster-calendar'] })]); };
  return <section aria-label="Dashboard roster" className="space-y-3">
    <div className="flex items-center justify-between gap-3"><h2 className="font-heading text-lg font-bold">Roster calendar</h2><Button size="sm" variant="outline" onClick={() => onNavigate('roster')}>Manage shifts</Button></div>
    <RosterCalendar workers={data.workers} clientName={id => data.clients.find(client => client.id === id)?.full_name || 'Unknown client'} onChanged={refresh} onEdit={setEditing} />
    <ShiftForm open={!!editing} onOpenChange={open => { if (!open) setEditing(null); }} initial={editing} clients={data.clients} workers={data.workers} goals={data.goals || []} team={data.team} shifts={data.shifts} onSaved={refresh} />
  </section>;
}