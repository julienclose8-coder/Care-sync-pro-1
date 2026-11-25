import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, BadgeCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate, todayStr } from "@/lib/format";
import { payRun } from "@/lib/payroll";
import PaymentForm from "@/components/billing/PaymentForm";
import SubmitPayRunButton from "@/components/billing/SubmitPayRunButton";
import PayrollClockDetails from "@/components/billing/PayrollClockDetails";
import ClientCharges from "@/components/billing/ClientCharges";

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
};

export default function BillingSection({ data, onChanged }) {
  const { workers, payments } = data;
  const queryClient = useQueryClient();
  const { data: shifts = [] } = useQuery({
    queryKey: ['payroll-shifts'],
    queryFn: () => base44.entities.Shift.list('date'),
    initialData: data.shifts,
    refetchInterval: 10000,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [presetWorker, setPresetWorker] = useState(null);

  useEffect(() => base44.entities.Shift.subscribe(() => {
    queryClient.invalidateQueries({ queryKey: ['payroll-shifts'] });
  }), [queryClient]);

  // team = registered non-admin users + roster-only workers (shifts with just a name)
  const team = (() => {
    const users = (workers || [])
      .filter((w) => w.role !== "admin")
      .map((w) => ({
        key: w.id, id: w.id, name: w.full_name || w.email,
        hourly_pay_rate: w.hourly_pay_rate || 0, saturday_rate: w.saturday_rate || 0, sunday_rate: w.sunday_rate || 0,
        sleepover_flat_rate: w.sleepover_flat_rate || 0, overtime_rate: w.overtime_rate || 0,
      }));
    const userNames = new Set(users.map((u) => u.name.toLowerCase()));
    const rosterOnly = new Map();
    (shifts || []).forEach((s) => {
      const nm = (s.worker_name || "").trim();
      if (!nm || s.worker_id) return;
      const k = nm.toLowerCase();
      if (!userNames.has(k) && !rosterOnly.has(k)) {
        rosterOnly.set(k, { key: `name:${nm}`, id: null, name: nm });
      }
    });
    return [...users, ...rosterOnly.values()];
  })();

  const matches = (entry, record) => {
    if (entry.id) return record.worker_id === entry.id;
    return !record.worker_id && (record.worker_name || "").toLowerCase() === entry.name.toLowerCase();
  };

  // completed shift hours not yet covered by a recorded payment
  const statsFor = (key) => {
    const entry = team.find((t) => t.key === key);
    if (!entry) return { hours: 0, from: "", to: "", lastPaid: "" };
    const lastPaid = (payments || [])
      .filter((p) => matches(entry, p))
      .map((p) => p.period_end || "")
      .sort()
      .pop() || "";
    const unpaid = (shifts || []).filter(
      (s) => matches(entry, s) && s.status === "completed" && s.clock_in && s.clock_out && (s.date || "") > lastPaid
    );
    const run = payRun(unpaid, entry);
    return { ...run, lastPaid };
  };

  const lastRateFor = (key) => {
    const entry = team.find((t) => t.key === key);
    const rates = (payments || []).filter((p) => entry && matches(entry, p)).map((p) => p.hourly_rate || 0);
    return entry?.hourly_pay_rate || (rates.length ? rates[rates.length - 1] : 0);
  };

  const pendingPayments = (payments || []).filter((p) => p.status === "pending");
  const owed = pendingPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const paidTotal = (payments || []).filter((p) => p.status === "paid").reduce((s, p) => s + (p.amount || 0), 0);
  // workers with completed, clocked hours not yet covered by a recorded payment
  const payable = team
    .map((entry) => ({ entry, st: statsFor(entry.key) }))
    .filter(({ st }) => st.hours > 0);
  const runTotal = payable.reduce((sum, { st }) => sum + st.pay, 0);

  const openForm = (worker) => {
    setEditing(null);
    setPresetWorker(worker || null);
    setFormOpen(true);
  };

  const openEdit = (p) => {
    setPresetWorker(null);
    setEditing(p);
    setFormOpen(true);
  };

  // settle all pending payments and auto-record payments for every worker with unpaid hours,
  // bringing the payroll tracker back to zero
  const submitPayRun = async () => {
    const today = todayStr();
    if (pendingPayments.length) {
      await base44.entities.WorkerPayment.updateMany(
        { status: "pending" },
        { $set: { status: "paid", paid_date: today } }
      );
    }
    if (payable.length) {
      await base44.entities.WorkerPayment.bulkCreate(
        payable.map(({ entry, st }) => ({
          worker_id: entry.id || "",
          worker_name: entry.name,
          period_start: st.from || today,
          period_end: st.to || today,
          hours: st.hours,
          hourly_rate: entry.hourly_pay_rate || 0,
          amount: st.pay,
          status: "paid",
          paid_date: today,
          notes: `Pay run — auto-calculated from completed supports${st.breakdown ? ` · ${st.breakdown}` : ""}`,
        }))
      );
    }
    onChanged();
  };

  const markPaid = async (p) => {
    await base44.entities.WorkerPayment.update(p.id, { status: "paid", paid_date: todayStr() });
    onChanged();
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete payment to ${p.worker_name || "worker"}?`)) return;
    await base44.entities.WorkerPayment.delete(p.id);
    onChanged();
  };

  const workerName = (id) => team.find((t) => t.id === id)?.name || "Worker";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight">Payroll</h1>
          <p className="text-muted-foreground mt-1">Track hours worked and pay your support workers</p>
        </div>
        <div className="flex gap-2">
          <SubmitPayRunButton
            pendingCount={pendingPayments.length}
            newCount={payable.length}
            total={runTotal}
            onSubmit={submitPayRun}
          />
          <Button onClick={() => openForm(null)}>
            <Plus className="w-4 h-4 mr-1.5" /> New payment
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
        <Card className="border shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Owed to workers</p>
            <p className="font-heading text-2xl font-extrabold mt-1">{formatCurrency(owed)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {(payments || []).filter((p) => p.status === "pending").length} payments pending
            </p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Paid to date</p>
            <p className="font-heading text-2xl font-extrabold mt-1">{formatCurrency(paidTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {(payments || []).filter((p) => p.status === "paid").length} payments settled
            </p>
          </CardContent>
        </Card>
      </div>

      <ClientCharges clients={data.clients || []} shifts={shifts || []} invoices={data.invoices || []} onSaved={onChanged} />

      <div>
        <h2 className="font-heading font-bold mb-3 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" /> Worker tracking
        </h2>
        {team.length === 0 ? (
          <div className="border border-dashed rounded-xl py-14 text-center text-muted-foreground">
            No support workers yet.
          </div>
        ) : (
          <div className="space-y-2">
            {team.map((w) => {
              const st = statsFor(w.key);
              return (
                <div key={w.key} data-payroll-worker={w.key} className="rounded-2xl border bg-card p-4 shadow-sm flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div className="flex-1 min-w-48">
                    <p className="text-sm font-bold">{w.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {st.hours > 0
                        ? `${st.hours} hrs completed & unpaid${st.from ? ` (${formatDate(st.from)} – ${formatDate(st.to)})` : ""}`
                        : "No unpaid hours"}
                      {st.hours > 0 && st.breakdown ? ` · ${st.breakdown}` : ""}
                      {st.lastPaid ? ` · last paid to ${formatDate(st.lastPaid)}` : " · never paid"}
                    </p>
                  </div>
                  <div className="min-w-28 text-right">
                    <p className="text-sm font-semibold">{st.hours > 0 ? formatCurrency(st.pay) : "—"}</p>
                    <p className="text-xs text-muted-foreground">est. pay run · base {formatCurrency(lastRateFor(w.key))}/hr</p>
                  </div>
                  <Button size="sm" variant={st.hours > 0 ? "default" : "outline"} onClick={() => openForm(w)}>
                    <Plus className="w-4 h-4 mr-1" /> Record payment
                  </Button>
                  <PayrollClockDetails shifts={(shifts || []).filter(s => matches(w, s))} clients={data.clients || []} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-heading font-bold mb-3">Payment history</h2>
        {(payments || []).length === 0 ? (
          <div className="border border-dashed rounded-xl py-14 text-center text-muted-foreground">
            No payments recorded yet — hours completed by workers will appear above.
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="rounded-2xl border bg-card p-4 shadow-sm flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="min-w-32">
                  <p className="text-sm font-bold">{p.worker_name || workerName(p.worker_id)}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.period_start ? `${formatDate(p.period_start)} – ${formatDate(p.period_end)}` : "—"}
                  </p>
                </div>
                <div className="flex-1 min-w-40">
                  <p className="text-sm font-medium">{p.hours || 0} hrs @ {formatCurrency(p.hourly_rate)}/hr</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.notes || (p.status === "paid" && p.paid_date ? `Paid ${formatDate(p.paid_date)}` : "Not yet paid")}
                  </p>
                </div>
                <p className="text-sm font-semibold min-w-24 text-right">{formatCurrency(p.amount)}</p>
                <Badge className={`${STATUS_STYLES[p.status] || ""} border-0`}>{p.status}</Badge>
                <div className="flex gap-1">
                  {p.status !== "paid" && (
                    <Button size="icon" variant="ghost" title="Mark as paid" onClick={() => markPaid(p)}>
                      <BadgeCheck className="w-4 h-4 text-emerald-600" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" title="Edit" onClick={() => openEdit(p)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Delete" onClick={() => handleDelete(p)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PaymentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        initialWorker={presetWorker}
        workers={team}
        getStats={statsFor}
        onSaved={onChanged}
      />
    </div>
  );
}