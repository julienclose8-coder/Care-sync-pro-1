import React, { useEffect, useState, useCallback } from "react";
import { api } from '@/api/client';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, RefreshCw, ShieldCheck, Clock, Users, UserCheck, Sparkles, PieChart } from "lucide-react";
import StatCard from "./StatCard";
import { formatDate, formatTime } from "@/lib/format";

const STATUS_LABEL = {
  available: "Available",
  over_hours: "Over weekly hours",
  over_client_hours: "At client cap",
  not_on_team: "Not on team",
  untrained: "Not trained",
  conflict: "Conflict",
  over_limit: "Weekly limit",
  not_possible: "Not possible",
};
const STATUS_TONE = {
  available: "bg-emerald-100 text-emerald-700",
  over_hours: "bg-amber-100 text-amber-700",
  over_client_hours: "bg-rose-100 text-rose-700",
  not_on_team: "bg-slate-100 text-slate-600",
  untrained: "bg-slate-100 text-slate-600",
  conflict: "bg-rose-100 text-rose-700",
  over_limit: "bg-rose-100 text-rose-700",
  not_possible: "bg-slate-100 text-slate-500",
};

export default function RecommendationsSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.functions.invoke("rosterRecommendations", { days: 14 });
      setData(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Unable to load recommendations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4 mr-2" /> Try again</Button>
      </div>
    );
  }
  if (!data) return null;

  const { summary, alerts, near, concentration, recommendations, window: win } = data;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight">Staffing recommendations</h1>
          <p className="text-muted-foreground mt-1">
            Team, load and skill rules across the next {win.days} days. Proactively reassign cover before the 6-hour daily limit is breached.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title="Shifts needing cover"
          value={summary.shifts_needing_cover}
          details={[{ label: "Window", value: `${win.from} → ${win.to}` }]}
        />
        <StatCard
          title="6-hour limit alerts"
          value={summary.alerts}
          details={[{ label: "At / over limit", value: summary.alerts }, { label: "Approaching", value: summary.near_limit }]}
        />
        <StatCard
          title="Concentration"
          value={summary.concentration}
          details={[{ label: "Over 40%", value: "one client" }, { label: "Threshold", value: ">3 clients / >20h" }]}
        />
        <StatCard
          title="Available workers"
          value={summary.available_workers}
          details={[{ label: "Avg weekly load", value: `${summary.avg_load_pct}%` }]}
        />
        <StatCard
          title="Near limit"
          value={summary.near_limit}
          details={[{ label: "Within", value: "4–6 hrs / client / day" }]}
        />
      </div>

      {/* Alerts: workers at/over the 6-hour daily client limit */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-500" />
          <h2 className="font-heading font-bold text-lg">6-hour daily limit alerts</h2>
          <Badge variant="secondary" className="ml-1">{alerts.length}</Badge>
        </div>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center border border-dashed rounded-xl">
            No worker has reached the 6-hour daily limit with a single client.
          </p>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <Card key={`${a.worker_id}-${a.client_id}-${a.date}`} className="border-rose-200 bg-rose-50/40 shadow-sm">
                <CardContent className="p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div className="min-w-28">
                    <p className="text-sm font-semibold">{formatDate(a.date)}</p>
                    <p className="text-xs text-muted-foreground">{a.shift_ids.length} shift{a.shift_ids.length > 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex-1 min-w-44">
                    <p className="text-sm font-medium">{a.worker_name || "Worker"}</p>
                    <p className="text-xs text-muted-foreground">{a.client_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading font-bold text-lg text-rose-600">{a.hours}h</p>
                    <p className="text-xs text-muted-foreground">of {a.max}h cap</p>
                  </div>
                  <Badge className={`${a.severity === "over" ? "bg-rose-600 text-white" : "bg-amber-500 text-white"} border-0`}>
                    {a.severity === "over" ? "Over limit" : "At limit"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Near limit */}
      {near.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <h2 className="font-heading font-bold text-lg">Approaching the limit</h2>
            <Badge variant="secondary" className="ml-1">{near.length}</Badge>
          </div>
          <div className="space-y-2">
            {near.map((a) => (
              <Card key={`near-${a.worker_id}-${a.client_id}-${a.date}`} className="border-amber-200 bg-amber-50/40 shadow-sm">
                <CardContent className="p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div className="min-w-28">
                    <p className="text-sm font-semibold">{formatDate(a.date)}</p>
                  </div>
                  <div className="flex-1 min-w-44">
                    <p className="text-sm font-medium">{a.worker_name || "Worker"}</p>
                    <p className="text-xs text-muted-foreground">{a.client_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading font-bold text-lg text-amber-600">{a.hours}h</p>
                    <p className="text-xs text-muted-foreground">of {a.max}h cap</p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 border-0">Approaching</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Client concentration */}
      {concentration.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-violet-500" />
            <h2 className="font-heading font-bold text-lg">Client concentration alerts</h2>
            <Badge variant="secondary" className="ml-1">{concentration.length}</Badge>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            One client is more than 40% of a worker's week, where the worker supports more than 3 clients or works over 20 hours.
          </p>
          <div className="space-y-2">
            {concentration.map((c) => (
              <Card key={`conc-${c.worker_id}-${c.client_id}-${c.week_start}`} className="border-violet-200 bg-violet-50/40 shadow-sm">
                <CardContent className="p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div className="min-w-28">
                    <p className="text-sm font-semibold">{c.worker_name}</p>
                    <p className="text-xs text-muted-foreground">{c.distinct_clients} clients · {c.total_hours}h</p>
                  </div>
                  <div className="flex-1 min-w-44">
                    <p className="text-sm font-medium">{c.client_name}</p>
                    <p className="text-xs text-muted-foreground">{c.client_hours}h of {c.total_hours}h this week</p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading font-bold text-lg text-violet-600">{c.pct}%</p>
                    <p className="text-xs text-muted-foreground">of their week</p>
                  </div>
                  <Badge className="bg-violet-100 text-violet-700 border-0">Over 40%</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Recommendations per shift needing cover */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-lg">Recommended cover</h2>
          <Badge variant="secondary" className="ml-1">{recommendations.length}</Badge>
        </div>
        {recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center border border-dashed rounded-xl">
            Every scheduled shift in the next {win.days} days has cover assigned.
          </p>
        ) : (
          <div className="space-y-3">
            {recommendations.map((r) => (
              <Card key={r.shift.id} className="border shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <div className="min-w-28">
                      <p className="text-sm font-semibold">{formatDate(r.shift.date)}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(r.shift.start_time)} – {formatTime(r.shift.end_time)}</p>
                    </div>
                    <div className="flex-1 min-w-40">
                      <p className="text-sm font-medium">{r.shift.client_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.shift.service_type}
                        {r.shift.support_setting === "in_home" ? " · In-home" : r.shift.support_setting === "centre_based" ? " · Centre-based" : ""}
                        {r.shift.needs_replacement ? ` · Replacing ${r.shift.original_worker || "sick worker"}` : " · Unassigned"}
                      </p>
                    </div>
                    {r.client_context.high_support && (
                      <Badge className="bg-primary/10 text-primary border-0"><ShieldCheck className="w-3 h-3 mr-1" /> High support</Badge>
                    )}
                    {r.client_context.locked && (
                      <Badge variant="outline" className="border-amber-300 text-amber-700">Locked roster</Badge>
                    )}
                  </div>

                  {r.candidates.length === 0 ? (
                    <p className="text-xs text-muted-foreground pl-2">
                      {r.total_candidates === 0
                        ? "No workers available to assess."
                        : `${r.total_candidates} worker${r.total_candidates > 1 ? "s" : ""} reviewed — none meet the team, skill and load rules for this shift.`}
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-3">
                      {r.candidates.map((c, i) => (
                        <div key={c.worker_id} className="rounded-xl border bg-muted/30 p-3 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                              {i === 0 && <UserCheck className="w-3.5 h-3.5 text-primary shrink-0" />}
                              {c.worker_name}
                            </p>
                            <Badge className={`${STATUS_TONE[c.status] || ""} border-0 text-[11px]`}>{STATUS_LABEL[c.status]}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            <span>Load {c.load_pct}%</span>
                            <span>Same client {c.same_client_hours}h</span>
                            <span>Match {c.need_match_pct}%</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className={c.on_team ? "text-emerald-600" : "text-muted-foreground"}>{c.on_team ? "On team" : "Off team"}</span>
                            <span className={c.trained ? "text-emerald-600" : "text-muted-foreground"}>{c.trained ? "Trained" : "Untrained"}</span>
                            {c.available_today && <span className="text-primary flex items-center gap-0.5"><Users className="w-3 h-3" /> Free</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}