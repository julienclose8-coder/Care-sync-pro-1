import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, CalendarDays } from "lucide-react";
import ShiftForm from "@/components/roster/ShiftForm";
import SupportLocationSummary from "@/components/supports/SupportLocationSummary";
import { formatDate, formatTime, todayStr } from "@/lib/format";

const STATUS_STYLES = {
  scheduled: "bg-emerald-100 text-emerald-700",
  completed: "bg-teal-100 text-teal-700",
  cancelled: "bg-slate-100 text-slate-500",
};

function ShiftRow({ shift, onEdit }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">
          {formatDate(shift.date)} · {formatTime(shift.start_time)}–{formatTime(shift.end_time)}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {shift.service_type} · {shift.worker_name || "Unassigned"}
        </p>
        <SupportLocationSummary record={shift} showAddress={false} />
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Badge className={`${STATUS_STYLES[shift.status] || ""} border-0`}>{shift.status}</Badge>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function SupportsCard({ client, workers, shifts, onChanged }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const today = todayStr();
  const sorted = [...shifts].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const upcoming = sorted.filter((s) => s.status === "scheduled" && (s.date || "") >= today);
  const past = sorted.filter((s) => s.status !== "scheduled" || (s.date || "") < today).reverse().slice(0, 5);

  const openForm = (shift) => {
    setEditing(shift || null);
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="w-4 h-4 text-primary" /> Supports
        </CardTitle>
        <Button size="sm" onClick={() => openForm(null)}>
          <Plus className="w-4 h-4 mr-1" /> Assign support
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcoming.length === 0 && past.length === 0 && (
          <p className="text-sm text-muted-foreground">No supports assigned yet.</p>
        )}
        {upcoming.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Upcoming</p>
            {upcoming.map((s) => <ShiftRow key={s.id} shift={s} onEdit={() => openForm(s)} />)}
          </div>
        )}
        {past.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent</p>
            {past.map((s) => <ShiftRow key={s.id} shift={s} onEdit={() => openForm(s)} />)}
          </div>
        )}
      </CardContent>

      <ShiftForm
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        clients={[client]}
        defaultClientId={client.id}
        workers={workers}
        shifts={shifts}
        onSaved={onChanged}
      />
    </Card>
  );
}