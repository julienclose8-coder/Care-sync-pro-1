import React, { useEffect, useState } from "react";
import { usePageRefresh } from '@/hooks/usePullToRefresh';
import { base44 } from "@/api/base44Client";
import { HeartHandshake, LogOut, Loader2, Sparkles, HeartPulse, ShieldAlert, CalendarDays, Plus, PencilLine, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, formatTime, todayStr } from "@/lib/format";
import { addDays, format } from "date-fns";
import SupportRequestDialog from "@/components/supports/SupportRequestDialog";
import GoalRequestDialog from "@/components/supports/GoalRequestDialog";
import ClientTeamSection from "@/components/portals/ClientTeamSection";
import VisitCancellationButton from "@/components/portals/VisitCancellationButton";
import VisitDateChangeButton from "@/components/portals/VisitDateChangeButton";
import SupportLocationSummary from "@/components/supports/SupportLocationSummary";
import { SUPPORT_SETTINGS, supportSetting } from "@/lib/supportSettings";
import ComplaintPortalLink from '@/components/complaints/ComplaintPortalLink';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import DeleteAccountButton from '@/components/account/DeleteAccountButton';

const REQUEST_STYLES = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  declined: "bg-red-100 text-red-700"
};
const TYPE_LABELS = { new: "New support", change: "Change", cancel: "Cancellation", goal: "Goal / expectation" };

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3">
      <Icon className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm whitespace-pre-wrap">{value || "—"}</p>
      </div>
    </div>);

}

export default function ClientPortal({ user, client }) {
  const [shifts, setShifts] = useState(null);
  const [invoices, setInvoices] = useState(null);
  const [requests, setRequests] = useState(null);
  const [requestType, setRequestType] = useState(null);
  const [goalOpen, setGoalOpen] = useState(false);

  const loadShifts = () =>
  base44.entities.Shift.filter({ client_id: client.id }, "date").then(setShifts).catch(() => setShifts([]));

  const loadRequests = () =>
  base44.entities.SupportRequest.
  filter({ client_id: client.id }, "-created_date").
  then(setRequests).
  catch(() => setRequests([]));

  const loadInvoices = () => base44.entities.Invoice.filter({ client_id: client.id }, "-issue_date").then(setInvoices).catch(() => setInvoices([]));
  usePageRefresh(() => Promise.all([loadShifts(), loadRequests(), loadInvoices()]));

  useEffect(() => {
    loadShifts();
    loadInvoices();
    loadRequests();
  }, []);

  if (!shifts || !invoices || !requests)
  return (
    <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>);


  const today = todayStr();
  const confirmationCutoff = format(addDays(new Date(`${today}T00:00:00`), 7), "yyyy-MM-dd");
  const upcoming = shifts.filter((s) => s.status === "scheduled" && s.date >= today);
  const firstName = (client.full_name || "there").split(" ")[0];
  const usualSetting = supportSetting(client);
  const upcomingLabel = upcoming.length && upcoming.some((s) => supportSetting(s, client) !== usualSetting) ? "Upcoming supports" : usualSetting === "centre_based" ? "Upcoming centre sessions" : usualSetting === "in_home" ? "Upcoming home visits" : "Upcoming supports";

  const supportsMap = {};
  upcoming.forEach((s) => {
    const name = s.service_type || "Support";
    const setting = supportSetting(s, client);
    const key = `${name} · ${SUPPORT_SETTINGS[setting] || "Setting not assigned"}`;
    if (!supportsMap[key]) supportsMap[key] = { count: 0, next: s.date };
    supportsMap[key].count += 1;
  });
  const supports = Object.entries(supportsMap).map(([name, v]) => ({ name, ...v }));

  return (
    <div className="min-h-screen bg-teal-50/40">
      <header className="safe-area-top bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-500 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <p className="text-white/80 text-xs font-semibold uppercase tracking-wide">{usualSetting === "centre_based" ? "My centre supports" : usualSetting === "in_home" ? "My in-home supports" : "My care portal"}</p>
              <h1 className="font-heading text-2xl md:text-3xl font-extrabold leading-tight">Welcome back, {firstName}</h1>
            </div>
          </div>
          <Button size="sm" className="border-0 bg-white/15 text-white hover:bg-white/25 hover:text-white" onClick={() => base44.auth.logout()}>
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </div>
      </header>

      <PullToRefresh as="main" onRefresh={() => Promise.all([loadShifts(), loadRequests(), loadInvoices()])} className="max-w-4xl mx-auto p-4 md:px-8 md:pt-0 pb-8 space-y-6">
        <div className="-mt-8 md:-mt-10">
          <Card className="border-0 shadow-md">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{upcomingLabel}</p>
                <p className="font-heading text-xl font-extrabold">{upcoming.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="supports" className="space-y-4">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full bg-white border shadow-sm rounded-xl h-auto p-1">
            <TabsTrigger value="visits" className="py-2 rounded-lg">next supports</TabsTrigger>
            <TabsTrigger value="supports" className="py-2 rounded-lg">My supports</TabsTrigger>
            <TabsTrigger value="profile" className="py-2 rounded-lg">My profile</TabsTrigger>
            <TabsTrigger value="invoices" className="py-2 rounded-lg">My charges</TabsTrigger>
          </TabsList>

          <TabsContent value="supports" className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setRequestType("new")}>
                <Plus className="w-4 h-4" /> Request new support
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRequestType("change")}>
                <PencilLine className="w-4 h-4" /> Request a change
              </Button>
              <Button size="sm" variant="outline" onClick={() => setGoalOpen(true)}>
                <Target className="w-4 h-4" /> Share a goal or expectation
              </Button>
            </div>

            <section>
              <h2 className="font-heading font-bold text-lg mb-3">My current supports</h2>
              {supports.length === 0 ?
              <p className="border border-dashed rounded-xl py-10 text-center text-sm text-muted-foreground bg-white">
                  No supports scheduled yet — request one and we'll be in touch.
                </p> :

              <div className="grid gap-3 sm:grid-cols-2">
                  {supports.map((s) =>
                <Card key={s.name} className="border shadow-sm">
                      <CardContent className="p-4">
                        <p className="font-semibold text-sm">{s.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {s.count} upcoming support{s.count === 1 ? "" : "s"} · next {formatDate(s.next)}
                        </p>
                      </CardContent>
                    </Card>
                )}
                </div>
              }
            </section>

            <ClientTeamSection clientId={client.id} />

            <section>
              <h2 className="font-heading font-bold text-lg mb-3">My requests</h2>
              {requests.length === 0 ?
              <p className="border border-dashed rounded-xl py-10 text-center text-sm text-muted-foreground bg-white">
                  You haven't requested any supports yet.
                </p> :

              <div className="space-y-2">
                  {requests.map((r) =>
                <Card key={r.id} className="border shadow-sm">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="bg-teal-600 text-white border-0">{TYPE_LABELS[r.request_type] || "Request"}</Badge>
                          <p className="text-sm font-semibold flex-1">{r.request_type === "goal" ? r.goal : r.service_type}</p>
                          <Badge className={`${REQUEST_STYLES[r.status] || ""} border-0`}>{r.request_type === "cancel" && r.status === "approved" ? "Cancelled" : r.status}</Badge>
                        </div>
                        {r.support_setting && <SupportLocationSummary record={r} client={client} />}
                        {r.details && <p className="text-sm text-muted-foreground">{r.details}</p>}
                        {r.preferred_times && <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Preferred times:</span> {r.preferred_times}</p>}
                        {(r.goal || r.outcome) &&
                    <div className="grid gap-1.5 sm:grid-cols-2 text-xs text-muted-foreground">
                            {r.request_type !== "goal" && r.goal && <p><span className="font-semibold text-foreground">Goal:</span> {r.goal}</p>}
                            {r.outcome && <p><span className="font-semibold text-foreground">Outcome:</span> {r.outcome}</p>}
                          </div>
                    }
                        <p className="text-xs text-muted-foreground">Requested {formatDate((r.created_date || "").slice(0, 10))}</p>
                      </CardContent>
                    </Card>
                )}
                </div>
              }
            </section>
          </TabsContent>

          <TabsContent value="visits" className="space-y-2">
            <h2 className="font-heading font-bold text-lg">{upcomingLabel}</h2>
            {upcoming.length === 0 ?
            <p className="border border-dashed rounded-xl py-10 text-center text-sm text-muted-foreground bg-white">
                No upcoming supports scheduled.
              </p> :

            upcoming.map((s) =>
            <Card key={s.id} data-visit-id={s.id} className="border shadow-sm">
                  <CardContent className="p-4 flex flex-wrap items-center gap-x-6 gap-y-1">
                    <div className="min-w-28">
                      <p className="text-sm font-semibold">{formatDate(s.date)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(s.start_time)} – {formatTime(s.end_time)}
                      </p>
                    </div>
                    <div className="flex-1 min-w-40 space-y-1"><p className="text-sm text-muted-foreground">{s.service_type || "Support"}</p><SupportLocationSummary record={s} client={client} /></div>
                    <Badge className={`${s.worker_id && s.date <= confirmationCutoff ? "bg-emerald-600" : "bg-teal-600"} text-white border-0`}>{s.worker_id && s.date <= confirmationCutoff ? "Confirmed" : "Scheduled"}</Badge>
                    <div className="flex flex-wrap gap-2">
                      <VisitDateChangeButton client={client} shift={s} requests={requests} onSent={loadRequests} />
                      <VisitCancellationButton client={client} shift={s} requests={requests} onSent={() => Promise.all([loadRequests(), loadShifts()])} />
                    </div>
                  </CardContent>
                </Card>
            )
            }
          </TabsContent>

          <TabsContent value="invoices" className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Charges are billed to your funding — there's nothing to pay here.
            </p>
            {invoices.length === 0 ?
            <p className="border border-dashed rounded-xl py-10 text-center text-sm text-muted-foreground bg-white">
                No charges yet.
              </p> :

            invoices.map((inv) =>
            <div key={inv.id} className="rounded-xl border bg-white px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1">
                  <div className="min-w-28">
                    <p className="text-sm font-semibold">{inv.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(inv.issue_date)}</p>
                  </div>
                  <p className="flex-1 min-w-40 text-sm text-muted-foreground truncate">{inv.description || "—"}</p>
                  <p className="text-sm font-semibold">{formatCurrency(inv.amount)}</p>
                </div>
            )
            }
          </TabsContent>

          <TabsContent value="profile">
            <Card className="border shadow-sm">
              <CardContent className="p-5 space-y-4">
                <h2 className="font-heading font-bold text-lg">My profile</h2>
                <InfoRow icon={Sparkles} label={`Funding — ${client.funding_type || "not set"}`} value={client.plan_manager} />
                <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground">Usual support setting</p><SupportLocationSummary record={client} client={client} /></div>
                <InfoRow icon={HeartPulse} label="Support needs" value={client.support_needs} />
                {client.preferences && <InfoRow icon={HeartPulse} label="Preferences" value={client.preferences} />}
                <InfoRow icon={ShieldAlert} label="Emergency contact" value={client.emergency_contact} />
                <div className="border-t pt-3"><DeleteAccountButton /></div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <ComplaintPortalLink type="external" />

        <SupportRequestDialog
          open={!!requestType}
          onOpenChange={(open) => !open && setRequestType(null)}
          client={client}
          initialType={requestType || "new"}
          onSaved={loadRequests} />
        
        <GoalRequestDialog
          open={goalOpen}
          onOpenChange={setGoalOpen}
          client={client}
          onSaved={loadRequests} />
        
      </PullToRefresh>
    </div>);

}