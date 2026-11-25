import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, todayStr } from "@/lib/format";

const inDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const nextNumber = (invoices) => {
  const nums = invoices.map((i) => parseInt(String(i.invoice_number || "").replace(/\D/g, ""), 10) || 0);
  return `INV-${String(Math.max(0, ...nums) + 1).padStart(4, "0")}`;
};

export default function InvoiceForm({ open, onOpenChange, initial, preset, clients, invoices, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(
      initial?.id
        ? { ...initial }
        : {
            invoice_number: nextNumber(invoices), client_id: "", issue_date: todayStr(),
            due_date: inDays(14), description: "", hours: "", hourly_rate: "",
            status: "draft", notes: "", ...preset,
          }
    );
  }, [initial, preset, open]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const amount = form.hours && form.hourly_rate
    ? Math.round(form.hours * form.hourly_rate * 100) / 100
    : initial?.amount || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.client_id) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        hours: Number(form.hours) || 0,
        hourly_rate: Number(form.hourly_rate) || 0,
        amount,
      };
      if (initial?.id) await base44.entities.Invoice.update(initial.id, payload);
      else await base44.entities.Invoice.create(payload);
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial?.id ? `Edit ${initial.invoice_number}` : "New invoice"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Client *</Label>
            <Select value={form.client_id || ""} onValueChange={(v) => setForm((f) => ({ ...f, client_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="issue_date">Issue date *</Label>
              <Input id="issue_date" type="date" required value={form.issue_date || ""} onChange={set("issue_date")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due_date">Due date</Label>
              <Input id="due_date" type="date" value={form.due_date || ""} onChange={set("due_date")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description" rows={2} required
              value={form.description || ""} onChange={set("description")}
              placeholder="e.g. Personal care support — August fortnight"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="hours">Hours</Label>
              <Input id="hours" type="number" min="0" step="0.25" value={form.hours ?? ""} onChange={set("hours")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hourly_rate">Hourly rate ($)</Label>
              <Input id="hourly_rate" type="number" min="0" step="0.05" value={form.hourly_rate ?? ""} onChange={set("hourly_rate")} />
            </div>
          </div>
          <div className="rounded-xl bg-muted p-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total (hours × rate)</p>
            <p className="font-heading font-extrabold text-lg">{formatCurrency(amount)}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["draft", "sent", "paid", "overdue"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.client_id}>
              {saving ? "Saving…" : initial?.id ? "Save changes" : "Create invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}