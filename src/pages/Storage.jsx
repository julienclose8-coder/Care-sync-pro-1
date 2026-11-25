import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { Link } from 'react-router-dom';
import { HardDrive, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import StorageConnectionDialog from '@/components/storage/StorageConnectionDialog';

export default function Storage() {
  const [access, setAccess] = useState('loading');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    api.auth.me().then(user => setAccess(user.role === 'admin' ? 'allowed' : 'denied')).catch(() => setAccess('denied'));
  }, []);
  if (access === 'loading') return <div className="flex justify-center p-12"><Loader2 aria-label="Checking storage access" className="animate-spin text-primary" /></div>;
  if (access === 'denied') return <main className="max-w-3xl mx-auto p-6 space-y-4"><h1 className="font-heading text-2xl font-bold">Storage access restricted</h1><p>Only admins and the current CEO can open storage settings.</p><Button asChild variant="outline"><Link to="/">Back to home</Link></Button></main>;
  return (
    <main className="max-w-3xl mx-auto p-4 md:p-10 space-y-6">
      <div><h1 className="font-heading text-3xl font-bold flex items-center gap-3"><HardDrive className="text-primary" />Storage</h1><p className="text-muted-foreground mt-2">Storage settings for admins and the CEO.</p></div>
      <Card>
        <CardHeader><CardTitle>Current storage</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm"><p className="font-semibold">Temporary app storage</p><p className="text-muted-foreground">Notes currently remain in the app. OneDrive is not linked, and application-level note encryption has not been configured.</p></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>OneDrive for Business</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="font-semibold">Setup pending</p>
          <p className="text-muted-foreground">When you’re ready, connect a shared business account for central storage. Users should view permitted data through the app, without receiving direct OneDrive access.</p>
          <p className="text-muted-foreground">Connection, encryption, and staff-level access controls must be completed before this becomes active storage. Nothing is moved automatically.</p>
          <Button onClick={() => setOpen(true)}>Show OneDrive connection steps</Button>
        </CardContent>
      </Card>
      <Button asChild variant="outline"><Link to="/">Back to home</Link></Button>
      <StorageConnectionDialog open={open} onOpenChange={setOpen} />
    </main>
  );
}