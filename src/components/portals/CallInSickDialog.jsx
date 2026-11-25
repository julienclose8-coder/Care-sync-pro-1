import React, { useState } from "react";
import { Loader2, ThermometerSun } from "lucide-react";
import { api } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { formatDate, formatTime } from "@/lib/format";

export default function CallInSickDialog({ open, onOpenChange, shift, client, onDone }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const clientName = client?.full_name || "the client";

  const close = () => {
    if (busy) return;
    setReason("");
    setError("");
    onOpenChange(false);
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await api.functions.invoke("callInSick", { shift_id: shift.id, reason: reason.trim() });
      toast({ title: "Sick leave recorded", description: "The team has been notified and the shift is flagged for a replacement." });
      setReason("");
      onOpenChange(false);
      onDone?.();
    } catch (err) {
      setError(err.response?.data?.error || "Unable to record sick leave. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ThermometerSun className="w-5 h-5 text-destructive" /> Call in sick
          </DialogTitle>
          <DialogDescription>
            {shift ? `${formatDate(shift.date)}, ${formatTime(shift.start_time)}–${formatTime(shift.end_time)} · ${clientName}` : "Flag this shift for a replacement and notify the team."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional) — e.g. unwell, caring for a sick family member"
            rows={3}
            maxLength={1000}
            disabled={busy}
          />
          <p className="text-xs text-muted-foreground">
            The roster will flag this shift as needing a replacement and the coordination team will be notified by email.
          </p>
        </div>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ThermometerSun className="w-4 h-4 mr-1" />}
            Confirm sick leave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}