import React from "react";
import { Users, CalendarDays, ReceiptText, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatTime, todayStr } from "@/lib/format";
import DashboardRoster from '@/components/roster/DashboardRoster';

const STATUS_STYLES = {
  scheduled: "bg-primary/10 text-primary",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-500",
};

export default function Overview({ data, onNavigate, onChanged }) {
  const { clients, shifts, invoices } = data;
  const today = todayStr();
  const activeClients = clients.filter((c) => c.status === "active").length;
  const upcoming = shifts.filter((s) => s.status === "scheduled" && s.date >= today);
  const outstanding = invoices
    .filter((i) => i.status !== "paid")
    .reduce((sum, i) => sum + (i.amount || 0), 0);
  const clientName = (id) => clients.find((c) => c.id === id)?.full_name || "Unknown client";

  const stats = [
    { label: "Active clients", value: activeClients, icon: Users, hint: `${clients.length} total on file` },
    { label: "Upcoming shifts", value: upcoming.length, icon: CalendarDays, hint: "Scheduled ahead" },
    { label: "Outstanding invoices", value: formatCurrency(outstanding), icon: ReceiptText, hint: "Awaiting payment" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening across your service.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, hint }) => (
          <Card key={label} className="border shadow-sm">
            <CardContent className="p-5 flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="font-heading text-2xl font-extrabold mt-1">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{hint}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <DashboardRoster data={data} onChanged={onChanged} onNavigate={onNavigate} />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-bold text-lg">Next shifts</h2>
          <Button variant="ghost" size="sm" onClick={() => onNavigate("roster")}>
            Full roster <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="space-y-2">
          {upcoming.slice(0, 5).map((s) => (
            <Card key={s.id} className="border shadow-sm">
              <CardContent className="p-4 flex flex-wrap items-center gap-x-6 gap-y-1">
                <div className="min-w-28">
                  <p className="text-sm font-semibold">{formatDate(s.date)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(s.start_time)} – {formatTime(s.end_time)}
                  </p>
                </div>
                <div className="flex-1 min-w-40">
                  <p className="text-sm font-medium">{clientName(s.client_id)}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.worker_name || "Unassigned"}
                    {s.service_type ? ` · ${s.service_type}` : ""}
                  </p>
                </div>
                <Badge className={`${STATUS_STYLES[s.status] || ""} border-0`}>{s.status}</Badge>
              </CardContent>
            </Card>
          ))}
          {upcoming.length === 0 && (
            <p className="text-sm text-muted-foreground py-10 text-center border border-dashed rounded-xl">
              No upcoming shifts scheduled.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}