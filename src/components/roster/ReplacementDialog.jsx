import React, { useEffect, useState } from "react";
import { Loader2, RefreshCw, UserCheck, CalendarClock, AlertTriangle } from "lucide-react";
import { api } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { formatDate, formatTime } from "@/lib/format";

const STATUS_META = {
  available: { label: "Free to cover", tone: "bg-emerald-100 text-emerald-700", assignable: true },
  over_hours: { label: "Over weekly hours · warning only", tone: "bg-amber-100 text-amber-700", assignable: true },
  not_on_team: { label: "Not on this client's team", tone: "bg-muted text-muted-foreground", assignable: false },
  untrained: { label: "Missing required training", tone: "bg-muted text-muted-foreground", assignable: false },
  conflict: { label: "Already rostered then", tone: "bg-muted text-muted-foreground", assignable: false },
  over_limit: { label: "Weekly hour limit blocked", tone: "bg-muted text-muted-foreground", assignable: false },
};

export default function ReplacementDialog({ open, onOpenChange, shift, clientName, onChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.functions.invoke("findReplacement", { shift_id: shift.id });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Unable to look for cover.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && shift) {
      setData(null);
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shift?.id]);

  const close = () => {
    if (assigning) return;
    onOpenChange(false);
  };

  const assign = async (candidate) => {
    setAssigning(candidate.worker_id);
    setError("");
    try {
      await api.functions.invoke("saveRosterShifts", {
        shift_id: shift.id,
        expected_updated_at: shift.updated_date,
        shift: { worker_id: candidate.worker_id, worker_name: candidate.worker_name },
      });
      toast({ title: "Cover assigned", description: `${candidate.worker_name} now covers this shift.` });
      onOpenChange(false);
      await onChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || "Unable to assign cover.");
    } finally {
      setAssigning("");
    }
  };

  const info = data?.shift;
  const assignable = (data?.candidates || []).filter((c) => STATUS_META[c.status].assignable);
  const nearMiss = (data?.candidates || []).filter((c) => !STATUS_META[c.status].assignable);

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" /> Find cover
          </DialogTitle>
          <DialogDescription>
            {shift ? `${formatDate(shift.date)}, ${formatTime(shift.start_time)}–${formatTime(shift.end_time)} · ${clientName || info?.client_name || "Client"}` : "Suggest an available worker to fill this shift."}
          </DialogDescription>
        </DialogHeader>

        {info?.sick_worker_name && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
            <p className="font-medium text-destructive">{info.sick_worker_name} called in sick</p>
            {info.replacement_reason && <p className="mt-0.5 text-xs text-muted-foreground">{info.replacement_reason}</p>}
          </div>
        )}

        {loading && <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Looking for free workers…</div>}

        {!loading && error && <div role="alert" className="space-y-2"><p className="text-sm text-destructive">{error}</p><Button variant="outline" size="sm" onClick={load}>Try again</Button></div>}

        {!loading && data && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge className="bg-emerald-100 text-emerald-700 border-0">{data.counts.available} free</Badge>
              <Badge className="bg-amber-100 text-amber-700 border-0">{data.counts.over_hours} over hours</Badge>
              <Badge variant="outline">{data.counts.near_miss} not eligible</Badge>
              <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs" disabled={!!assigning} onClick={load}><RefreshCw className="mr-1 h-3 w-3" />Refresh</Button>
            </div>

            {assignable.length === 0 && nearMiss.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No support workers found to suggest.</p>
            )}

            {assignable.length > 0 && (
              <div className="space-y-2">
                {assignable.map((c) => (
                  <CandidateRow key={c.worker_id} candidate={c} assigning={assigning === c.worker_id} onAssign={() => assign(c)} />
                ))}
              </div>
            )}

            {nearMiss.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Not eligible right now</p>
                {nearMiss.map((c) => (
                  <CandidateRow key={c.worker_id} candidate={c} disabled />
                ))}
              </div>
            )}
          </div>
        )}

        {error && !loading && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={!!assigning}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CandidateRow({ candidate, onAssign, assigning, disabled }) {
  const meta = STATUS_META[candidate.status];
  return (
    <div className={`rounded-xl border p-3 ${disabled ? "bg-muted/40" : "bg-card"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{candidate.worker_name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge className={`${meta.tone} border-0`}>{meta.label}</Badge>
            {candidate.available_today && <Badge variant="outline" className="border-emerald-300 text-emerald-700">Available</Badge>}
            {candidate.on_team && <Badge variant="outline">On team</Badge>}
          </div>
        </div>
        {!disabled && (
          <Button size="sm" className="h-8" disabled={!!assigning} onClick={onAssign}>
            {assigning ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <UserCheck className="mr-1 h-3.5 w-3.5" />}
            Assign
          </Button>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5 shrink-0" />
        <span>{candidate.weekly_hours}h / {candidate.weekly_limit}h this week</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className={`h-full rounded-full ${candidate.load_pct >= 100 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${candidate.load_pct}%` }} />
        </div>
        <span>{candidate.load_pct}%</span>
      </div>
      {candidate.status === "over_hours" && (
        <p className="mt-1.5 flex items-start gap-1 text-xs text-amber-700"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />Assigning this exceeds their weekly limit; their profile allows a warning.</p>
      )}
    </div>
  );
}