import React, { useState } from "react";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";

export default function SubmitPayRunButton({ pendingCount, newCount, total, onSubmit }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const nothingToSubmit = pendingCount === 0 && newCount === 0;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button variant="secondary" disabled={nothingToSubmit || saving} onClick={() => setOpen(true)}>
        <BadgeCheck className="h-4 w-4 mr-1.5" /> Submit pay run
      </Button>
      <Dialog open={open} onOpenChange={(o) => { if (!saving) setOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit pay run</DialogTitle>
            <DialogDescription>
              Settles everything now so the payroll tracker syncs to zero.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-1">
            {pendingCount > 0 && (
              <p>{pendingCount} pending payment{pendingCount === 1 ? "" : "s"} will be marked as paid</p>
            )}
            {newCount > 0 && (
              <p>{newCount} new payment{newCount === 1 ? "" : "s"} recorded for completed unpaid hours — {formatCurrency(total)}</p>
            )}
            <p className="text-muted-foreground text-xs">
              You can still edit or delete any payment afterwards from the history below.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={handleSubmit}>
              {saving ? "Submitting…" : "Submit pay run"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}