import React, { useEffect, useState } from "react";
import { api } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { todayStr } from "@/lib/format";

const BLANK = {
  worker_key: "", worker_id: "", worker_name: "",
  period_start: "", period_end: "",
  hours: 0, hourly_rate: 0, amount: 0, status: "pending", paid_date: "", notes: "",
};

export default function PaymentForm({ open, onOpenChange, initial, initialWorker, workers, getStats, onSaved }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      // map a saved payment back to its team entry key
      const entry = (workers || []).find(
        (w) => (initial.worker_id ? w.id === initial.worker_id : !initial.worker_id && w.name === initial.worker_name)
      );
      setForm({ ...BLANK, ...initial, worker_key: entry?.key || "" });
      return;
    }
    if (initialWorker) {
      const st = getStats(initialWorker.key);
      setForm({
        ...BLANK,
        worker_key: initialWorker.key,
        worker_id: initialWorker.id || "",
        worker_name: initialWorker.name,
        hours: st.hours,
        hourly_rate: initialWorker.hourly_pay_rate || 0,
        amount: st.pay,
        period_start: st.from || todayStr(),
        period_end: st.to || todayStr(),
        notes: st.hours > 0
          ? `Auto-calculated from completed supports${st.breakdown ? ` · ${st.breakdown}` : ""}`
          : "",
      });
      return;
    }
    setForm(BLANK);
  }, [open, initial, initialWorker]);

  const amount = Number(form.amount) || 0;

  const pickWorker = (key) => {
    const entry = (workers || []).find((w) => w.key === key);
    if (!entry) return;
    const st = getStats(key);
    setForm((f) => ({
      ...f,
      worker_key: key,
      worker_id: entry.id || "",
      worker_name: entry.name,
      hours: st.hours,
      hourly_rate: entry.hourly_pay_rate || 0,
      amount: st.pay,
      period_start: st.from || todayStr(),
      period_end: st.to || todayStr(),
      notes: st.hours > 0
        ? `Auto-calculated from completed supports${st.breakdown ? ` · ${st.breakdown}` : ""}`
        : "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { id, created_date, updated_date, created_by_id, worker_key, ...payload } = form;
      payload.amount = amount;
      if (payload.status === "paid" && !payload.paid_date) payload.paid_date = todayStr();
      if (initial?.id) await api.entities.WorkerPayment.update(initial.id, payload);
      else await api.entities.WorkerPayment.create(payload);
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit payment" : "Record payment"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Worker *</Label>
            <Select value={form.worker_key || ""} onValueChange={pickWorker} required>
              <SelectTrigger><SelectValue placeholder="Choose a worker" /></SelectTrigger>
              <SelectContent>
                {(workers || []).map((w) => (
                  <SelectItem key={w.key} value={w.key}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="period_start">Period from</Label>
              <Input id="period_start" type="date" value={form.period_start || ""}
                onChange={(e) => setForm((f) => ({ ...f, period_start: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="period_end">Period to</Label>
              <Input id="period_end" type="date" value={form.period_end || ""}
                onChange={(e) => setForm((f) => ({ ...f, period_end: e.target.value }))} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="hours">Hours</Label>
              <Input id="hours" type="number" step="0.01" min="0" value={form.hours ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, hours: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rate">Rate ($/hr)</Label>
              <Input id="rate" type="number" step="0.5" min="0" value={form.hourly_rate ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, hourly_rate: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input id="amount" type="number" step="0.01" min="0" value={form.amount ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status || "pending"} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.status === "paid" && (
              <div className="space-y-1.5">
                <Label htmlFor="paid_date">Paid on</Label>
                <Input id="paid_date" type="date" value={form.paid_date || ""}
                  onChange={(e) => setForm((f) => ({ ...f, paid_date: e.target.value }))} />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} value={form.notes || ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. fortnightly pay run" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.worker_key}>
              {saving ? "Saving…" : "Save payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}