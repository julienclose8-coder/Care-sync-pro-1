import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SupportRequestTiming from "@/components/supports/SupportRequestTiming";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { formatTime } from "@/lib/format";

import SupportSettingFields from "@/components/supports/SupportSettingFields";
import SupportLocationSummary from "@/components/supports/SupportLocationSummary";
import { settingDefaults, supportsForSetting } from "@/lib/supportSettings";

export default function SupportRequestDialog({ open, onOpenChange, client, initialType = "new", onSaved }) {
  const empty = { service_type: "Personal Care", details: "", preferred_times: "", goal: "", outcome: "" };
  const [form, setForm] = useState(empty);
  const [prefDate, setPrefDate] = useState(undefined);
  const [timing, setTiming] = useState({ hours: "", start: "", end: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const defaults = settingDefaults(client);
      setForm({ ...empty, ...defaults, service_type: supportsForSetting(client, defaults.support_setting)[0] });
      setPrefDate(undefined);
      setTiming({ hours: "", start: "", end: "" });
      setError("");
    }
  }, [open]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.support_setting) return setError("Choose In-home or Centre-based support.");
    if (!supportsForSetting(client, form.support_setting).includes(form.service_type)) return setError("Choose a support available in this setting.");
    const hasTiming = initialType === "new" || timing.hours || timing.start || timing.end;
    if (hasTiming) {
      if (!timing.hours || !timing.start || !timing.end) return setError("Enter support hours, start time and end time.");
      const minutes = (time) => { const [h, m] = time.split(":").map(Number); return h * 60 + m; };
      const duration = (minutes(timing.end) - minutes(timing.start) + 1440) % 1440 || 1440;
      if (!Number.isFinite(Number(timing.hours)) || Number(timing.hours) <= 0 || Number(timing.hours) > 24 || Math.abs(Number(timing.hours) * 60 - duration) > 0.01) {
        return setError("Support hours must match the start and end times. Please check all three fields.");
      }
    }
    setSaving(true);
    try {
      const preferred_times = [
        prefDate ? format(prefDate, "EEEE d MMM yyyy") : "",
        hasTiming ? `${formatTime(timing.start)} – ${formatTime(timing.end)}${timing.end <= timing.start ? " (next day)" : ""} · ${Number(timing.hours)} support hours` : "",
      ].filter(Boolean).join(" at ");
      await base44.entities.SupportRequest.create({
        ...form,
        centre_name: form.support_setting === "centre_based" ? client.centre_name || "" : "",
        centre_address: form.support_setting === "centre_based" ? client.centre_address || "" : "",
        preferred_times,
        client_id: client.id,
        request_type: initialType,
        status: "pending",
      });
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch (err) {
      setError(err.message || "Unable to send your request. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const isChange = initialType === "change";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isChange ? "Request a change to your supports" : "Request new support"}</DialogTitle>
          <DialogDescription>
            {isChange
              ? "Tell us what you'd like changed about a support you receive."
              : "Tell us what support you'd like added and what you want to achieve with it."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <SupportSettingFields value={form} editCentre={false} onChange={({ support_setting }) => setForm((f) => ({ ...f, support_setting, service_type: supportsForSetting(client, support_setting)[0] }))} />
          {form.support_setting && <SupportLocationSummary record={{ ...form, centre_name: client.centre_name || "", centre_address: client.centre_address || "" }} client={client} />}
          <div className="space-y-1.5">
            <Label>Support type</Label>
            <Select key={form.support_setting || "unassigned"} value={form.service_type} onValueChange={(v) => { if (v) setForm((f) => ({ ...f, service_type: v })); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supportsForSetting(client, form.support_setting).map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sr-details">{isChange ? "What would you like changed?" : "What do you need help with?"}</Label>
            <Textarea id="sr-details" rows={3} value={form.details} onChange={set("details")} required />
          </div>
          <SupportRequestTiming date={prefDate} onDateChange={setPrefDate} timing={timing} onChange={setTiming} required={!isChange} />
          <div className="space-y-1.5">
            <Label htmlFor="sr-goal">Your goal</Label>
            <Textarea
              id="sr-goal"
              rows={2}
              value={form.goal}
              onChange={set("goal")}
              placeholder="What would you like to achieve with this support?"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sr-outcome">Desired outcome</Label>
            <Textarea
              id="sr-outcome"
              rows={2}
              value={form.outcome}
              onChange={set("outcome")}
              placeholder="What success looks like for you"
            />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Sending…" : "Send request"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}