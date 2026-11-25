import React, { useEffect, useState } from "react";
import { History, Loader2, LockKeyhole } from "lucide-react";
import { api } from '@/api/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime } from "@/lib/format";

const ACTION_LABELS = {
  created: "Created",
  updated: "Updated",
  reassigned: "Worker reassigned",
  moved: "Moved",
  cancelled: "Cancelled",
  deleted: "Deleted",
  called_in_sick: "Called in sick",
  replacement_cleared: "Replacement cleared",
};

const ACTION_VARIANT = {
  created: "secondary",
  updated: "secondary",
  reassigned: "default",
  moved: "default",
  cancelled: "destructive",
  deleted: "destructive",
  called_in_sick: "destructive",
  replacement_cleared: "default",
};

const formatDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
};

export default function ShiftHistoryDialog({ open, onOpenChange, shift, clientName }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !shift?.id) return;
    let cancelled = false;
    setLoading(true);
    setItems([]);
    api.entities.ShiftHistory.filter({ shift_id: shift.id }, { sort: "-created_date", limit: 100 })
      .then((page) => { if (!cancelled) setItems(page.items || []); })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, shift?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" /> Shift history
          </DialogTitle>
          <DialogDescription>
            {shift ? `${formatDate(shift.date)}, ${formatTime(shift.start_time)}\u2013${formatTime(shift.end_time)}${clientName ? ` \u00b7 ${clientName}` : ""}` : "Change log for this shift."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No changes recorded yet.</p>
        ) : (
          <ol className="space-y-3">
            {items.map((h) => (
              <li key={h.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <Badge variant={ACTION_VARIANT[h.action] || "secondary"}>{ACTION_LABELS[h.action] || h.action}</Badge>
                  {h.locked_at_change && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                      <LockKeyhole className="w-3 h-3" /> Locked week
                    </span>
                  )}
                </div>
                {h.detail && <p className="mt-1.5 text-sm font-medium break-words">{h.detail}</p>}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDateTime(h.created_date)}{" \u00b7 "}{h.actor_name || "System"}{h.actor_role ? ` (${h.actor_role})` : ""}
                </p>
                {Array.isArray(h.changes) && h.changes.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs">
                    {h.changes.map((c, i) => (
                      <li key={i} className="text-muted-foreground break-words">
                        <span className="font-medium text-foreground">{c.label || c.field}:</span>{" "}
                        {c.from || "\u2014"}{" \u2192 "}{c.to || "\u2014"}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}