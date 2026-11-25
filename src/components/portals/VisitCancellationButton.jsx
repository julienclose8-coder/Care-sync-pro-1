import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BellRing } from "lucide-react";
import { formatDate, formatTime } from "@/lib/format";

export default function VisitCancellationButton({ client, shift, requests, onSent }) {
  const [stage, setStage] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const sent = requests.some((request) => request.request_type === "cancel" && request.shift_id === shift.id);
  const sendNotice = async () => {
    setSending(true);
    setError("");
    try {
      await base44.functions.invoke("cancelClientShift", { shift_id: shift.id });
      await onSent();
      setStage("sent");
    } catch (err) {
      setError(err.response?.data?.error || "Unable to cancel this support. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return <>
    {sent && !stage ? <Badge className="bg-red-100 text-red-700 border-0">Support cancelled</Badge> : <Button data-cancel-shift={shift.id} size="sm" variant="outline" onClick={() => setStage("confirm")} disabled={sending}><BellRing className="w-4 h-4" />Cancel support</Button>}
    <Dialog open={!!stage} onOpenChange={(open) => !open && setStage(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{stage === "sent" ? "Support cancelled" : "Cancel this support?"}</DialogTitle><DialogDescription>{stage === "sent" ? "This support has been cancelled and the worker's roster has been updated." : `Are you sure you want to cancel the support on ${formatDate(shift.date)}? The assigned worker will see it as cancelled immediately.`}</DialogDescription></DialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>{stage === "confirm" ? <><Button variant="outline" onClick={() => setStage(null)}>Keep support</Button><Button variant="destructive" onClick={sendNotice} disabled={sending}>{sending ? "Cancelling…" : "Yes, cancel support"}</Button></> : <Button onClick={() => setStage(null)}>Done</Button>}</DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}