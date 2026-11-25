import React, { useMemo, useState } from "react";
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Plus, Check, X, Pencil, Trash2, CalendarDays, List, Sparkles, Loader2, CircleAlert } from "lucide-react";
import RosterCalendar from "./RosterCalendar";
import SupportLocationSummary from "@/components/supports/SupportLocationSummary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ShiftForm from "./ShiftForm";
import { formatDate, formatTime, shiftHours, todayStr } from "@/lib/format";
import PullToRefresh from '@/components/mobile/PullToRefresh';
import useAdminViewState from '@/hooks/useAdminViewState';
import useOptimisticRosterStatus from '@/hooks/useOptimisticRosterStatus';
import { rosterState } from '@/lib/rosterState';

export default function RosterSection({ data, onChanged }) {
  const { clients, workers } = data;
  const cache = useQueryClient();
  const { shifts, pending, setStatus } = useOptimisticRosterStatus(data.shifts, onChanged);
  const [filter, setFilter] = useAdminViewState('roster:filter', 'all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useAdminViewState('roster:view', 'calendar');
  const [insights, setInsights] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const clientName = (id) => clients.find((c) => c.id === id)?.full_name || "Unknown client";
  const visible = filter === "all" ? shifts : shifts.filter((s) => s.status === filter);

  const byDate = useMemo(() => {
    const groups = {};
    visible.forEach((s) => {
      (groups[s.date] = groups[s.date] || []).push(s);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [visible]);

  const handleDelete = async (shift) => {
    if (!window.confirm("Delete this shift?")) return;
    await api.functions.invoke('saveRosterShifts', { action: 'delete', shift_id: shift.id });
    await Promise.all([onChanged(), cache.invalidateQueries({ queryKey: ['roster-calendar'] })]);
  };

  const today = todayStr();
  const unassignedCount = shifts.filter((shift) => shift.status === "scheduled" && shift.date >= today && !shift.worker_id).length;

  const fetchInsights = async () => {
    setInsightLoading(true);
    try {
      const res = await api.functions.invoke("rosterInsights", {});
      setInsights(res.data.insights || []);
    } finally {
      setInsightLoading(false);
    }
  };

  return (
    <PullToRefresh onRefresh={onChanged} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight">Roster</h1>
          <p className="text-muted-foreground mt-1">{shifts.length} shifts on the books</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="inline-flex rounded-lg border bg-muted/50 p-0.5">
            <Button size="sm" variant={view === "calendar" ? "default" : "ghost"} className="h-8" onClick={() => setView("calendar")}>
              <CalendarDays className="w-4 h-4 mr-1" /> Calendar
            </Button>
            <Button size="sm" variant={view === "list" ? "default" : "ghost"} className="h-8" onClick={() => setView("list")}>
              <List className="w-4 h-4 mr-1" /> List
            </Button>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["all", "scheduled", "completed", "cancelled"].map((f) => (
                <SelectItem key={f} value={f}>
                  {f === "all" ? "All shifts" : f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Add shift
          </Button>
        </div>
      </div>

      {unassignedCount > 0 && (
        <div role="alert" className="flex items-center gap-3 rounded-xl border border-destructive bg-destructive/10 px-4 py-3 text-destructive">
          <CircleAlert className="h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">{unassignedCount} upcoming shift{unassignedCount === 1 ? " is" : "s are"} not assigned to a worker.</p>
        </div>
      )}

      <div className="rounded-2xl border bg-gradient-to-br from-teal-50 to-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold">AI roster insights</p>
          </div>
          <Button size="sm" variant="outline" onClick={fetchInsights} disabled={insightLoading}>
            {insightLoading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-1" />
            )}
            {insightLoading ? "Analysing…" : "Analyse roster"}
          </Button>
        </div>
        {insights && (insights.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {insights.map((it, i) => (
              <li key={i} className="rounded-xl border bg-card px-3 py-2">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">{it.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{it.detail}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground mt-2">
            No suggestions right now — add more shifts so patterns can form.
          </p>
        ))}
      </div>

      {view === "calendar" ? (
        <RosterCalendar workers={workers} status={filter} clientName={clientName} onChanged={onChanged} onEdit={(shift) => { setEditing(shift); setFormOpen(true); }} />
      ) : byDate.length === 0 ? (
        <div className="border border-dashed rounded-xl py-14 text-center text-muted-foreground">
          No shifts here yet — add your first shift to build the roster.
        </div>
      ) : (
        byDate.map(([date, dayShifts]) => (
          <div key={date} className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-bold">{formatDate(date)}</h2>
              {date === today && <Badge className="bg-primary text-primary-foreground border-0">Today</Badge>}
            </div>
            {dayShifts.map((s) => (
              <div
                key={s.id}
                data-shift-id={s.id}
                aria-busy={pending(s.id)}
                className={`rounded-2xl border p-4 shadow-sm flex flex-wrap items-center gap-x-6 gap-y-2 ${rosterState(s).colour}`}
              >
                <div className="min-w-32">
                  <p className="text-sm font-semibold">{formatTime(s.start_time)} – {formatTime(s.end_time)}</p>
                  <p className="text-xs text-muted-foreground">{shiftHours(s.start_time, s.end_time)} hrs</p>
                </div>
                <div className="flex-1 min-w-44">
                  <p className="text-sm font-medium">{clientName(s.client_id)}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.service_type || "Support"} · <span className={s.status === "scheduled" && !s.worker_id ? "font-semibold text-destructive" : ""}>{s.worker_name || "Unassigned"}</span>
                  </p>
                  <SupportLocationSummary record={s} client={clients.find((c) => c.id === s.client_id)} showAddress={false} />
                </div>
                <Badge variant="outline">{rosterState(s).label}</Badge>
                <div className="flex gap-1">
                  {s.status === "scheduled" && (
                    <>
                      <Button size="icon" variant="ghost" disabled={pending(s.id)} title="Mark completed" onClick={() => setStatus(s, "completed")}>
                        <Check className="w-4 h-4 text-emerald-600" />
                      </Button>
                      <Button size="icon" variant="ghost" disabled={pending(s.id)} title="Cancel shift" onClick={() => setStatus(s, "cancelled")}>
                        <X className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </>
                  )}
                  <Button size="icon" variant="ghost" disabled={pending(s.id)} title="Edit" onClick={() => { setEditing(s); setFormOpen(true); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" disabled={pending(s.id)} title="Delete" onClick={() => handleDelete(s)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ))
      )}

      <ShiftForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        clients={clients}
        workers={workers}
        goals={data.goals || []}
        team={data.team}
        shifts={shifts}
        onSaved={() => Promise.all([onChanged(), cache.invalidateQueries({ queryKey: ['roster-calendar'] })])}
      />
    </PullToRefresh>
  );
}