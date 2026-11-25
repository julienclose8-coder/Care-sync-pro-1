import React, { useEffect, useState } from "react";
import { api } from '@/api/client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import WorkerTrainingFields from "./WorkerTrainingFields";
import WorkerDocumentUpload from "./WorkerDocumentUpload";

const blank = { full_name: "", email: "", phone: "", address: "", pay_account_name: "", bsb: "", account_number: "", payroll_reference: "", hourly_pay_rate: 0, saturday_rate: 0, sunday_rate: 0, sleepover_flat_rate: 0, overtime_rate: 0, weekly_hour_limit: 38, hour_limit_action: "warning", trainings: [], documents: [] };
export default function WorkerFormDialog({ open, onOpenChange, worker, onSaved }) {
  const [form, setForm] = useState(blank); const [saving, setSaving] = useState(false);
  useEffect(() => setForm(worker ? { ...blank, ...worker } : blank), [worker, open]);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setSaving(true);
    const payload = {
      full_name: form.full_name, email: form.email, phone: form.phone, address: form.address,
      pay_account_name: form.pay_account_name, bsb: form.bsb, account_number: form.account_number,
      payroll_reference: form.payroll_reference, hourly_pay_rate: Number(form.hourly_pay_rate),
      saturday_rate: Number(form.saturday_rate), sunday_rate: Number(form.sunday_rate),
      sleepover_flat_rate: Number(form.sleepover_flat_rate), overtime_rate: Number(form.overtime_rate), weekly_hour_limit: Number(form.weekly_hour_limit),
      hour_limit_action: form.hour_limit_action, trainings: form.trainings, documents: form.documents,
    };
    if (worker?.worker_source === "user") { delete payload.full_name; delete payload.email; }
    if (worker?.id) await api.entities[worker.worker_source === "profile" ? "Worker" : "User"].update(worker.id, payload);
    else await api.entities.Worker.create(payload);
    setSaving(false); onOpenChange(false); onSaved();
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{worker ? "Edit worker" : "Add worker profile"}</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="worker-name">Full name *</Label><Input id="worker-name" required value={form.full_name} onChange={set("full_name")} /></div><div><Label htmlFor="worker-email">Email</Label><Input id="worker-email" type="email" value={form.email} onChange={set("email")} /></div><div><Label htmlFor="worker-contact">Phone</Label><Input id="worker-contact" value={form.phone} onChange={set("phone")} /></div><div><Label htmlFor="worker-address-admin">Address</Label><Input id="worker-address-admin" value={form.address} onChange={set("address")} /></div></div>
    <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="account-name">Account name</Label><Input id="account-name" value={form.pay_account_name} onChange={set("pay_account_name")} /></div><div><Label htmlFor="payroll-ref">Payroll reference</Label><Input id="payroll-ref" value={form.payroll_reference} onChange={set("payroll_reference")} /></div><div><Label htmlFor="bsb">BSB</Label><Input id="bsb" value={form.bsb} onChange={set("bsb")} /></div><div><Label htmlFor="account-number">Account number</Label><Input id="account-number" value={form.account_number} onChange={set("account_number")} /></div></div>
    <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="worker-pay-rate">Hourly pay rate ($)</Label><Input id="worker-pay-rate" type="number" min="0" step="0.05" value={form.hourly_pay_rate} onChange={set("hourly_pay_rate")} /></div><div><Label htmlFor="weekly-limit">Weekly hours allowed</Label><Input id="weekly-limit" type="number" min="0" step="0.25" required value={form.weekly_hour_limit} onChange={set("weekly_hour_limit")} /></div><div><Label>When limit is exceeded</Label><Select value={form.hour_limit_action} onValueChange={(value) => setForm((current) => ({ ...current, hour_limit_action: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="warning">Warn when rostering</SelectItem><SelectItem value="block">Block the shift</SelectItem></SelectContent></Select></div></div>
    <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="worker-saturday-rate">Saturday rate ($/hr)</Label><Input id="worker-saturday-rate" type="number" min="0" step="0.05" value={form.saturday_rate} onChange={set("saturday_rate")} /><p className="text-xs text-muted-foreground mt-1">Leave 0 to use the base hourly rate</p></div><div><Label htmlFor="worker-sunday-rate">Sunday rate ($/hr)</Label><Input id="worker-sunday-rate" type="number" min="0" step="0.05" value={form.sunday_rate} onChange={set("sunday_rate")} /><p className="text-xs text-muted-foreground mt-1">Leave 0 to use the base hourly rate</p></div><div><Label htmlFor="worker-sleepover-rate">Sleepover flat rate ($)</Label><Input id="worker-sleepover-rate" type="number" min="0" step="0.05" value={form.sleepover_flat_rate} onChange={set("sleepover_flat_rate")} /><p className="text-xs text-muted-foreground mt-1">Paid for the sleep window on sleepover shifts, plus hourly pay for awake time</p></div><div><Label htmlFor="worker-overtime-rate">Overtime rate ($/hr)</Label><Input id="worker-overtime-rate" type="number" min="0" step="0.05" value={form.overtime_rate} onChange={set("overtime_rate")} /><p className="text-xs text-muted-foreground mt-1">Hours beyond 10 in a shift; leave 0 to use 1.5× the hourly rate. Sleepovers excluded</p></div></div>
    <WorkerTrainingFields value={form.trainings} onChange={(trainings) => setForm((current) => ({ ...current, trainings }))} /><WorkerDocumentUpload value={form.documents} onChange={(documents) => setForm((current) => ({ ...current, documents }))} />
    <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save worker"}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}