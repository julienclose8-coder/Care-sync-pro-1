import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ClientSettingOptions from "@/components/clients/ClientSettingOptions";
import { settingDefaults, settingPayload } from "@/lib/supportSettings";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EMPTY = {
  full_name: "", email: "", phone: "", address: "", date_of_birth: "",
  funding_type: "NDIS", plan_manager: "", support_needs: "", preferences: "",
  emergency_contact: "", hourly_charge_rate: 0, status: "active", in_home_support: false,
  disability_info: "",
};

export default function ClientForm({ open, onOpenChange, initial, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    if (!initial) {
      setForm({ ...EMPTY, ...settingDefaults(null), setting_supports: {} });
      return;
    }
    const next = { ...EMPTY, ...initial, ...settingDefaults(initial) };
    Object.keys(EMPTY).forEach((key) => {
      if (next[key] == null) next[key] = EMPTY[key];
    });
    setForm(next);
  }, [initial, open]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.support_setting) return;
    setError("");
    setSaving(true);
    try {
      const { id, created_date, updated_date, created_by_id, ...payload } = { ...form, ...settingPayload(form) };
      if (!payload.date_of_birth) delete payload.date_of_birth;
      if (!payload.email) delete payload.email;
      Object.keys(payload).forEach((key) => payload[key] == null && delete payload[key]);
      if (initial?.id) await base44.entities.Client.update(initial.id, payload);
      else await base44.entities.Client.create(payload);
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err.message || "Unable to save the client.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit client" : "Add client"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="full_name">Full name *</Label>
              <Input id="full_name" required value={form.full_name} onChange={set("full_name")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={set("email")} placeholder="Used for client portal login" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={set("phone")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date_of_birth">Date of birth</Label>
              <Input id="date_of_birth" type="date" value={form.date_of_birth || ""} onChange={set("date_of_birth")} />
            </div>
            <div className="space-y-1.5">
              <Label>Funding type</Label>
              <Select value={form.funding_type} onValueChange={(v) => setForm((f) => ({ ...f, funding_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["NDIS", "Home Care Package", "Private", "Other"].map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address} onChange={set("address")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan_manager">Plan manager</Label>
              <Input id="plan_manager" value={form.plan_manager} onChange={set("plan_manager")} placeholder="e.g. self-managed / agency" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On hold</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><ClientSettingOptions form={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} /></div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="support_needs">Support needs</Label>
              <Textarea id="support_needs" rows={3} value={form.support_needs} onChange={set("support_needs")} placeholder="Care requirements, mobility, communication needs…" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="preferences">Preferences</Label>
              <Textarea id="preferences" rows={2} value={form.preferences} onChange={set("preferences")} placeholder="Routines, likes, things to avoid…" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="emergency_contact">Emergency contact</Label>
              <Input id="emergency_contact" value={form.emergency_contact} onChange={set("emergency_contact")} placeholder="Name and phone" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="disability_info">Disability details</Label>
              <Textarea
                id="disability_info"
                rows={2}
                value={form.disability_info || ""}
                onChange={set("disability_info")}
                placeholder="Care context, mobility and equipment requirements."
              />
            </div>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.full_name || !form.support_setting}>
              {saving ? "Saving…" : initial?.id ? "Save changes" : "Add client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}