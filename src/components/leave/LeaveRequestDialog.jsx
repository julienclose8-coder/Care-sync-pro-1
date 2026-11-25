import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import LeaveRequestForm from '@/components/leave/LeaveRequestForm';
import LeaveRequestsList from '@/components/leave/LeaveRequestsList';

export default function LeaveRequestDialog({ open, onOpenChange, workerId }) {
  const cache = useQueryClient();
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85dvh] overflow-y-auto">
      <DialogHeader><DialogTitle>Apply for leave / unavailability</DialogTitle><DialogDescription>Request whole days or specific dates and times for manager approval.</DialogDescription></DialogHeader>
      <LeaveRequestForm workerId={workerId} onSaved={() => cache.invalidateQueries({ queryKey: ['worker-leave'] })} />
      <div className="border-t pt-4"><LeaveRequestsList workerId={workerId} /></div>
    </DialogContent>
  </Dialog>;
}