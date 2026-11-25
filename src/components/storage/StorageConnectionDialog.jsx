import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function StorageConnectionDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Link OneDrive when you’re ready</DialogTitle>
          <DialogDescription>Use one business account as the app’s central storage, not individual users’ drives.</DialogDescription>
        </DialogHeader>
        <ol className="list-decimal pl-5 space-y-3 text-sm">
          <li>Return to the Base44 builder chat and ask: <span className="font-semibold">“Connect my shared OneDrive for Business account for storage.”</span></li>
          <li>Approve the Microsoft connection using the business account you want the app to use.</li>
          <li>After connection, complete encrypted storage and staff-access setup before moving notes out of temporary app storage.</li>
        </ol>
        <p className="text-sm text-muted-foreground">Shared-account approval cannot be started from this app page. Opening these steps does not connect Microsoft, move notes, or grant anyone drive access.</p>
        <Button onClick={() => onOpenChange(false)}>Done</Button>
      </DialogContent>
    </Dialog>
  );
}