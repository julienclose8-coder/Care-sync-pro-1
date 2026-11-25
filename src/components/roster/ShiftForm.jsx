import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { todayStr, availabilitySummary, formatTime, shiftHours } from "@/lib/format";
import { hasAllTrainings } from "@/lib/trainings";
import { addWeeks, format, isSameWeek, parseISO } from "date-fns";
import RecurringShiftFields from "./RecurringShiftFields";
import ShiftGoalsField from "./ShiftGoalsField";
import SupportSettingFields from "@/components/supports/SupportSettingFields";
import { Checkbox } from "@/components/ui/checkbox";
import { settingDefaults, supportSetting } from "@/lib/supportSettings";

const SERVICES = ["Personal Care", "Domestic Assistance", "Community Access", "Respite", "Transport", "Other"];

export default function ShiftForm({ open, onOpenChange, initial, clients, workers, goals = [], team = [], shifts = [], onSaved, defaultClientId }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    const client = clients.find((c) => c.id === (initial?.client_id || defaultClientId));
    setForm(
      initial?.id
        ? { ...settingDefaults(client), ...initial, support_setting: supportSetting(initial, client) }
        : {
            client_id: defaultClientId || "", worker_id: "", date: todayStr(), start_time: "09:00",
            end_time: "12:00", service_type: "Personal Care", goal_ids: [], notes: "", status: "scheduled",
            is_sleepover: false, sleep_start: "", sleep_end: "",
            recurrence_mode: "none", recurrence_count: 4, recurrence_end_date: "", ...settingDefaults(client),
          }
    );
  }, [initial, open]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.client_id || !form.support_setting) return;
    setError("");
    setSaving(true);
    try {
      const worker = (workers || []).find((w) => w.id === form.worker_id);
      const { recurrence_count, id, created_date, updated_date, created_by_id, ...storedForm } = form;
      if (storedForm.support_setting !== "centre_based") { storedForm.centre_name = ""; storedForm.centre_address = ""; }
      if (!storedForm.is_sleepover) { storedForm.sleep_start = ""; storedForm.sleep_end = ""; }
      const dates = [form.date];
      if (!initial?.id && form.recurrence_mode === "week_count") {
        for (let index = 1; index < Math.min(104, Number(recurrence_count) || 1); index += 1) dates.push(format(addWeeks(parseISO(form.date), index), "yyyy-MM-dd"));
      }
      if (!initial?.id && form.recurrence_mode === "end_date" && form.recurrence_end_date) {
        for (let index = 1; index < 104; index += 1) { const date = format(addWeeks(parseISO(form.date), index), "yyyy-MM-dd"); if (date > form.recurrence_end_date) break; dates.push(date); }
      }
      if (!initial?.id && form.recurrence_mode === "ongoing") {
        for (let index = 1; index < 52; index += 1) dates.push(format(addWeeks(parseISO(form.date), index), "yyyy-MM-dd"));
      }
      const seriesId = dates.length > 1 ? crypto.randomUUID() : "";
      const payload = { ...storedForm, recurrence_series_id: initial?.recurrence_series_id || seriesId, recurrence_week_count: dates.length, worker_name: worker ? worker.full_name || worker.email : "" };
      if (!payload.recurrence_end_date) delete payload.recurrence_end_date;
      await base44.functions.invoke('saveRosterShifts', { shift_id: initial?.id, expected_updated_at: initial?.updated_date, shift: payload, dates });
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Unable to save the shift.");
    } finally {
      setSaving(false);
    }
  };

  const availableWorkers = (workers || []).filter((w) => w.role !== "admin");
  const selectedWorker = (workers || []).find((w) => w.id === form.worker_id);
  const selectedClient = (clients || []).find((c) => c.id === form.client_id);
  const serviceOptions = [...new Set([...SERVICES, ...(selectedClient?.support_rates || []).map((rate) => rate.name).filter(Boolean)])];
  const requirements = selectedClient?.training_requirements || [];
  const approvedTeamIds = (team || [])
    .filter((m) => m.client_id === form.client_id && m.status === "approved")
    .map((m) => m.worker_id);
  const eligibleWorkers = availableWorkers.filter(
    (w) => approvedTeamIds.includes(w.id) && hasAllTrainings(w, requirements)
  );
  // a worker is blocked out if they already have a shift overlapping this date/time
  const busyShifts = (shifts || []).filter(
    (s) =>
      s.id !== initial?.id &&
      s.worker_id &&
      s.status !== "cancelled" &&
      s.date === form.date &&
      s.start_time < form.end_time &&
      s.end_time > form.start_time
  );
  const busyWorkerIds = new Set(busyShifts.map((s) => s.worker_id));
  const freeWorkers = eligibleWorkers.filter((w) => !busyWorkerIds.has(w.id));
  // keep an already-assigned worker selectable when editing an existing shift
  const assignedWorker = initial?.worker_id
    ? availableWorkers.find((w) => w.id === initial.worker_id)
    : null;
  const workerOptions =
    assignedWorker && !freeWorkers.some((w) => w.id === assignedWorker.id)
      ? [...freeWorkers, assignedWorker]
      : freeWorkers;
  const selectedWorkerBusyShift = form.worker_id
    ? busyShifts.find((s) => s.worker_id === form.worker_id)
    : null;
  const weeklyLimit = Number(selectedWorker?.weekly_hour_limit ?? 38);
  const existingWeeklyHours = selectedWorker && form.date
    ? (shifts || []).filter((s) => s.id !== initial?.id && s.worker_id === selectedWorker.id && s.status !== "cancelled" && isSameWeek(parseISO(s.date), parseISO(form.date), { weekStartsOn: 1 })).reduce((sum, s) => sum + shiftHours(s.start_time, s.end_time), 0)
    : 0;
  const proposedHours = shiftHours(form.start_time, form.end_time);
  const weeklyTotal = existingWeeklyHours + proposedHours;
  const weeklyLimitExceeded = !!selectedWorker && weeklyTotal > weeklyLimit;
  const blockWeeklyLimit = weeklyLimitExceeded && selectedWorker.hour_limit_action === "block";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit shift" : "Add shift"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Client *</Label>
            <Select value={form.client_id || ""} onValueChange={(v) => setForm((f) => ({ ...f, client_id: v, ...settingDefaults(clients.find((c) => c.id === v)) }))}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Support worker</Label>
            <Select
              value={form.worker_id || "none"}
              onValueChange={(v) => setForm((f) => ({ ...f, worker_id: v === "none" ? "" : v }))}
            >
              <SelectTrigger><SelectValue placeholder="Assign worker" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {workerOptions.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.full_name || w.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedWorker?.availability?.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Usually available: {availabilitySummary(selectedWorker.availability)}
              </p>
            )}
            {availableWorkers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Invite support workers to the app to assign them here.
              </p>
            )}
            {form.client_id && (
              <p className="text-xs text-muted-foreground">
                {requirements.length > 0
                  ? `Requires ${requirements.join(", ")} — only approved team members with these trainings can be rostered.`
                  : "Only workers approved for this client's support team can be rostered."}
                {eligibleWorkers.length === 0 && " No eligible workers yet — approve them on the client's profile."}
                {busyShifts.length > 0 && " Workers already rostered at this time are hidden to avoid double-booking."}
              </p>
            )}
            {selectedWorkerBusyShift && (
              <p className="text-xs text-destructive">
                This worker is already rostered {formatTime(selectedWorkerBusyShift.start_time)} – {formatTime(selectedWorkerBusyShift.end_time)} that day. Adjust the times or pick another worker.
              </p>
            )}
            {weeklyLimitExceeded && (
              <p className={blockWeeklyLimit ? "text-xs text-destructive" : "text-xs text-amber-700"}>
                This shift brings the worker to {weeklyTotal.toFixed(2)} of {weeklyLimit} allowed hours this week. {blockWeeklyLimit ? "This worker's profile blocks shifts over the limit." : "You can continue because this worker's profile is set to warning only."}
              </p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-3 sm:col-span-1">
              <Label htmlFor="date">Date *</Label>
              <Input id="date" type="date" required value={form.date || ""} onChange={set("date")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="start_time">Start *</Label>
              <Input id="start_time" type="time" required value={form.start_time || ""} onChange={set("start_time")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_time">End *</Label>
              <Input id="end_time" type="time" required value={form.end_time || ""} onChange={set("end_time")} />
            </div>
          </div>
          <div className="rounded-xl border p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_sleepover"
                checked={!!form.is_sleepover}
                onCheckedChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    is_sleepover: v === true,
                    ...(v === true
                      ? { sleep_start: f.sleep_start || "22:00", sleep_end: f.sleep_end || "06:00" }
                      : { sleep_start: "", sleep_end: "" }),
                  }))
                }
              />
              <Label htmlFor="is_sleepover" className="cursor-pointer">Sleepover shift</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Paid the worker's flat sleepover rate for the sleep window plus their hourly rate for awake time. The 10-hour overtime rule does not apply to sleepovers.
            </p>
            {form.is_sleepover && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sleep_start">Sleep starts</Label>
                  <Input id="sleep_start" type="time" value={form.sleep_start || ""} onChange={set("sleep_start")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sleep_end">Sleep ends</Label>
                  <Input id="sleep_end" type="time" value={form.sleep_end || ""} onChange={set("sleep_end")} />
                </div>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Service type</Label>
            <Select value={form.service_type} onValueChange={(v) => setForm((f) => ({ ...f, service_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {serviceOptions.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <SupportSettingFields value={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />
          <ShiftGoalsField goals={goals.filter((goal) => goal.client_id === form.client_id)} selected={form.goal_ids || []} onChange={(goal_ids) => setForm((current) => ({ ...current, goal_ids }))} />
          <RecurringShiftFields form={{ ...form, id: initial?.id }} onChange={(patch) => setForm((current) => ({ ...current, ...patch }))} />
          {initial?.id && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["scheduled", "completed", "cancelled"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} value={form.notes || ""} onChange={set("notes")} placeholder="Anything the worker should know…" />
          </div>
          <p className="text-xs text-muted-foreground">A client is required; a worker can be assigned later. Shifts lock seven days before support. Changes to a locked assignment create a request in the worker’s portal for acknowledgement.</p>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.client_id || !form.support_setting || !!selectedWorkerBusyShift || blockWeeklyLimit}>
              {saving ? "Saving…" : initial?.id ? "Save changes" : "Add shift"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}