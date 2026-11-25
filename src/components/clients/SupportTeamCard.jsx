import React, { useState } from "react";
import useOptimisticSupportTeam from '@/hooks/useOptimisticSupportTeam';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UsersRound, Plus, Check, X } from "lucide-react";
import { availabilitySummary, formatDate } from "@/lib/format";

export default function SupportTeamCard({ client, shifts, workers, onChanged }) {
  const [adding, setAdding] = useState(false);
  const { team, error, saving, loadTeam, addMember, approve } = useOptimisticSupportTeam(client.id, onChanged, () => setAdding(false));

  const remove = (m) =>
    api.entities.SupportTeamMember
      .delete(m.id)
      .then(() => {
        loadTeam();
        if (onChanged) onChanged();
      });

  // visit stats per worker from the shift history
  const stats = {};
  [...shifts]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .forEach((s) => {
      if (s.status === "cancelled" || !s.worker_id) return;
      if (!stats[s.worker_id]) stats[s.worker_id] = { upcoming: 0, lastDate: "" };
      if (s.status === "scheduled") stats[s.worker_id].upcoming += 1;
      if ((s.date || "") >= (stats[s.worker_id].lastDate || "")) stats[s.worker_id].lastDate = s.date;
    });

  const requirements = client.training_requirements || [];
  const onTeamIds = new Set((team || []).map((m) => m.worker_id));
  const addable = (workers || []).filter((w) => !onTeamIds.has(w.id));

  return (
    <Card aria-label="Support team">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <UsersRound className="w-4 h-4 text-primary" /> Support team
          </span>
          <Button size="sm" variant="outline" className="h-7" disabled={!team || saving} onClick={() => setAdding((a) => !a)}>
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {adding &&
          (addable.length === 0 ? (
            <p className="text-xs text-muted-foreground">Every worker is already on this team.</p>
          ) : (
            <Select onValueChange={(v) => v && addMember(v)}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Choose a worker to add…" />
              </SelectTrigger>
              <SelectContent>
                {addable.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.full_name || w.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}

        {!team ? (
          <p className="text-sm text-muted-foreground">Loading team…</p>
        ) : team.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No workers on the team yet — add workers here and approve them before rostering them for this client.
          </p>
        ) : (
          team.map((m) => {
            const worker = (workers || []).find((w) => w.id === m.worker_id);
            const name = worker?.full_name || worker?.email || "Unknown worker";
            const stat = stats[m.worker_id];
            const missing = requirements.filter((r) => !(worker?.trainings || []).includes(r));
            return (
              <div key={m.id} data-team-member={m.id} aria-busy={!!m._saving} className="rounded-xl border p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {stat?.upcoming > 0 ? `${stat.upcoming} upcoming` : "No upcoming shifts"}
                      {stat?.lastDate ? ` · last visit ${formatDate(stat.lastDate)}` : ""}
                    </p>
                  </div>
                  <Badge
                    className={
                      m.status === "approved"
                        ? "bg-emerald-100 text-emerald-700 border-0"
                        : "bg-amber-100 text-amber-700 border-0"
                    }
                  >
                    {m.status === "approved" ? "Approved" : "Needs approval"}
                  </Badge>
                </div>
                {requirements.length > 0 && (
                  <p className={`text-xs ${missing.length === 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {missing.length === 0
                      ? "All required trainings approved"
                      : `Missing training: ${missing.join(", ")}`}
                  </p>
                )}
                {worker?.availability?.length > 0 && (
                  <p className="text-xs text-muted-foreground truncate">
                    Usually available: {availabilitySummary(worker.availability)}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {m.status !== "approved" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" disabled={saving} onClick={() => approve(m)}>
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Approve for rostering
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" disabled={saving} onClick={() => remove(m)}>
                    <X className="w-3.5 h-3.5" /> Remove
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}