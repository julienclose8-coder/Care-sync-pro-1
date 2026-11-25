import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function StorageConnectionDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Where files are stored</DialogTitle>
          <DialogDescription>Use one business account as the app’s central storage, not individual users’ drives.</DialogDescription>
        </DialogHeader>
        <p className="text-sm">Documents and notes are stored in the app’s own private, encrypted storage in Sydney, Australia. Only signed-in staff with the right access can open them, using short-lived links.</p>
        <p className="text-sm text-muted-foreground">A shared OneDrive for Business link is not set up yet. Ask your administrator if you need one.</p>
        <Button onClick={() => onOpenChange(false)}>Done</Button>
      </DialogContent>
    </Dialog>
  );
}