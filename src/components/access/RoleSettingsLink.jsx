import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';

export default function RoleSettingsLink() {
  const { data } = useQuery({ queryKey: ['staff-access', 'context'], queryFn: async () => (await api.functions.invoke('staffAccess', { action: 'context' })).data });
  if (!data?.can_activate) return null;
  return <div className="flex justify-end border-b bg-card p-3"><Button asChild variant="outline"><Link to="/staff-access">Role settings</Link></Button></div>;
}