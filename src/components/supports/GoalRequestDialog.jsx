import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function GoalRequestDialog({ open, onOpenChange, client, onSaved }) {
  const [goal, setGoal] = useState("");
  const [outcome, setOutcome] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setGoal("");
      setOutcome("");
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.SupportRequest.create({
        client_id: client.id,
        request_type: "goal",
        service_type: "Other",
        goal,
        outcome,
        status: "pending",
      });
      onOpenChange(false);
      if (onSaved) onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share a goal or expectation</DialogTitle>
          <DialogDescription>
            Tell us what you want to achieve — your care team will review it and let you know once it's approved.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="gr-goal">Your goal or expectation</Label>
            <Textarea
              id="gr-goal"
              rows={3}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. I'd like to build confidence catching the bus on my own"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gr-outcome">What success looks like</Label>
            <Textarea
              id="gr-outcome"
              rows={2}
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="e.g. I can travel to my weekly appointment without help"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Sending…" : "Send for approval"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}