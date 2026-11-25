import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TRAININGS } from "@/lib/trainings";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MapPin, Clock, CalendarDays, BadgeCheck } from "lucide-react";
import { formatDate, formatTime, shiftHours, todayStr, WEEKDAYS } from "@/lib/format";
import WorkerAdminDetails from "./WorkerAdminDetails";

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3">
      <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function WorkerDetailDialog({ worker, data, onClose, onChanged, onEdit }) {
  return (
    <Dialog open={!!worker} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {worker && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between gap-3 pr-6">
                <DialogTitle className="truncate">{worker.full_name || worker.email}</DialogTitle>
                <Button size="sm" variant="outline" onClick={() => onEdit(worker)}>Edit profile</Button>
              </div>
            </DialogHeader>
            <div className="space-y-5">
              <div className="space-y-3">
                <InfoRow icon={Mail} label="Email" value={worker.email} />
                <InfoRow icon={Phone} label="Phone" value={worker.phone} />
                <InfoRow icon={MapPin} label="Address" value={worker.address} />
              </div>

              <div>
                <h3 className="font-heading font-semibold text-sm mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Weekly availability
                </h3>
                {(worker.availability || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Not set — the worker can add this from their profile.</p>
                ) : (
                  <div className="space-y-1">
                    {WEEKDAYS.filter((d) => (worker.availability || []).some((a) => a.day === d.value)).map((d) => {
                      const slot = worker.availability.find((a) => a.day === d.value);
                      return (
                        <p key={d.value} className="text-sm">
                          <span className="text-muted-foreground w-24 inline-block">{d.label}</span>
                          {formatTime(slot.start)} – {formatTime(slot.end)}
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>

              <WorkerAdminDetails worker={worker} />
              <WorkerTrainings worker={worker} onChanged={onChanged} />
              <WorkerShifts worker={worker} data={data} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function WorkerTrainings({ worker, onChanged }) {
  const [trainings, setTrainings] = useState(worker.trainings || []);
  const [saving, setSaving] = useState(false);

  const toggle = async (t, checked) => {
    const next = checked ? [...trainings, t] : trainings.filter((x) => x !== t);
    setTrainings(next);
    setSaving(true);
    try {
      const entity = worker.worker_source === "profile" ? "Worker" : "User";
      await base44.entities[entity].update(worker.id, { trainings: next });
      if (onChanged) onChanged();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h3 className="font-heading font-semibold text-sm mb-1 flex items-center gap-2">
        <BadgeCheck className="w-4 h-4 text-primary" /> Training approvals
      </h3>
      <p className="text-xs text-muted-foreground mb-2">
        Tick a training once it's verified — a worker needs the client's required trainings approved before they can be rostered.
      </p>
      <div className="space-y-2">
        {TRAININGS.map((t) => {
          const approved = trainings.includes(t);
          return (
            <label
              key={t}
              className="flex items-center gap-2.5 text-sm rounded-lg border px-3 py-2 cursor-pointer hover:bg-muted/50"
            >
              <Checkbox checked={approved} onCheckedChange={(v) => toggle(t, !!v)} />
              <span className="flex-1">{t}</span>
              <Badge variant="outline" className={approved ? "text-emerald-600 border-emerald-200" : "text-muted-foreground"}>
                {approved ? "Approved" : "Not approved"}
              </Badge>
            </label>
          );
        })}
      </div>
      {saving && <p className="text-xs text-muted-foreground mt-2">Saving…</p>}
    </div>
  );
}

function WorkerShifts({ worker, data }) {
  const today = todayStr();
  const clientName = (id) => data.clients.find((c) => c.id === id)?.full_name || "Unknown client";
  const mine = data.shifts.filter((s) => s.worker_id === worker.id);
  const upcoming = mine.filter((s) => s.status === "scheduled" && s.date >= today);
  const hours = mine
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + shiftHours(s.start_time, s.end_time), 0);

  return (
    <div>
      <h3 className="font-heading font-semibold text-sm mb-2 flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-primary" /> Assigned shifts
      </h3>
      <p className="text-xs text-muted-foreground mb-2">
        {upcoming.length} upcoming · {hours} hrs completed
      </p>
      {upcoming.length === 0 ? (
        <p className="text-xs text-muted-foreground">No upcoming shifts assigned.</p>
      ) : (
        <div className="space-y-2">
          {upcoming.map((s) => (
            <Card key={s.id} className="border shadow-sm">
              <CardContent className="p-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="min-w-28">
                  <p className="text-sm font-semibold">{formatDate(s.date)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(s.start_time)} – {formatTime(s.end_time)}
                  </p>
                </div>
                <p className="flex-1 text-sm min-w-32 truncate">{clientName(s.client_id)}</p>
                <Badge className="bg-primary/10 text-primary border-0">{s.service_type || "Support"}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}