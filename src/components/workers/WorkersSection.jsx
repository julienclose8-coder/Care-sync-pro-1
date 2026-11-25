import React, { useState } from "react";
import { Phone, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { availabilitySummary, shiftHours, todayStr } from "@/lib/format";
import { TRAININGS } from "@/lib/trainings";
import WorkerDetailDialog from "./WorkerDetailDialog";
import WorkerFormDialog from "./WorkerFormDialog";
import useAdminViewState from '@/hooks/useAdminViewState';

export default function WorkersSection({ data, onChanged }) {
  const { workers, shifts } = data;
  const [viewing, setViewing] = useAdminViewState('workers:viewing', null);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const supportWorkers = workers.filter((w) => w.role !== "admin");
  const today = todayStr();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight">Workers</h1>
          <p className="text-muted-foreground mt-1">
            {supportWorkers.length} support worker{supportWorkers.length === 1 ? "" : "s"} on the team
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" />Add worker</Button>
      </div>

      {supportWorkers.length === 0 ? (
        <div className="border border-dashed rounded-xl py-14 text-center text-muted-foreground max-w-lg">
          No support workers yet. Add a profile to start managing worker details.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {supportWorkers.map((w) => {
            const mine = shifts.filter((s) => s.worker_id === w.id);
            const upcoming = mine.filter((s) => s.status === "scheduled" && s.date >= today).length;
            const hours = mine
              .filter((s) => s.status === "completed")
              .reduce((sum, s) => sum + shiftHours(s.start_time, s.end_time), 0);
            return (
              <div key={w.id} data-worker-id={w.id} className="rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{w.full_name || w.email}</p>
                    <p className="text-sm text-muted-foreground truncate">{w.email}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setViewing(w)}>View</Button>
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> {w.phone || "No phone set"}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {availabilitySummary(w.availability)}
                  </p>
                  <p>{upcoming} upcoming shift{upcoming === 1 ? "" : "s"} · {hours} hrs completed</p>
                  <p>{(w.trainings || []).length} of {TRAININGS.length} trainings approved</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <WorkerDetailDialog worker={viewing} data={data} onClose={() => setViewing(null)} onChanged={onChanged} onEdit={(worker) => { setViewing(null); setEditing(worker); setFormOpen(true); }} />
      <WorkerFormDialog open={formOpen} onOpenChange={setFormOpen} worker={editing} onSaved={onChanged} />
    </div>
  );
}