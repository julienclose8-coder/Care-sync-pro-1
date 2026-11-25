import React from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { formatDate } from "@/lib/format";
import SupportLocationSummary from "@/components/supports/SupportLocationSummary";

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  declined: "bg-red-100 text-red-700",
};
const TYPE_LABELS = { new: "New support", change: "Change", cancel: "Cancellation notice", goal: "Goal / expectation" };

export default function RequestsSection({ data, onChanged }) {
  const { requests, clients } = data;
  const clientName = (id) => clients.find((c) => c.id === id)?.full_name || "Unknown client";
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const setStatus = async (r, status) => {
    await base44.entities.SupportRequest.update(r.id, { status });
    if (status === "approved" && r.request_type === "goal" && r.goal) {
      await base44.entities.Goal.create({
        client_id: r.client_id,
        title: r.goal,
        description: r.outcome || "",
        status: "active",
      });
    }
    onChanged();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight">Support requests</h1>
        <p className="text-muted-foreground mt-1">
          {pendingCount} pending · {requests.length} total request{requests.length === 1 ? "" : "s"}
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="border border-dashed rounded-xl py-14 text-center text-muted-foreground max-w-lg">
          No support requests yet. Requests your clients send from their portal will appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id} className="border shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-primary/10 text-primary border-0">{TYPE_LABELS[r.request_type] || "Request"}</Badge>
                  <p className="text-sm font-semibold">
                    {clientName(r.client_id)} · {r.service_type}
                  </p>
                  <Badge className={`${STATUS_STYLES[r.status] || ""} border-0 ml-auto`}>{r.request_type === "cancel" && r.status === "approved" ? "Cancelled" : r.status}</Badge>
                </div>
                {r.support_setting && <SupportLocationSummary record={r} client={clients.find((c) => c.id === r.client_id)} />}
                {(r.request_type === "goal" ? r.goal : r.details) && (
                  <p className="text-sm">{r.request_type === "goal" ? r.goal : r.details}</p>
                )}
                {(r.goal || r.outcome || r.preferred_times) && (
                  <div className="grid gap-1.5 sm:grid-cols-3 text-xs text-muted-foreground">
                    {r.preferred_times && (
                      <p><span className="font-semibold text-foreground">Preferred times:</span> {r.preferred_times}</p>
                    )}
                    {r.request_type !== "goal" && r.goal && <p><span className="font-semibold text-foreground">Goal:</span> {r.goal}</p>}
                    {r.outcome && <p><span className="font-semibold text-foreground">Outcome:</span> {r.outcome}</p>}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-muted-foreground mr-auto">Requested {formatDate((r.created_date || "").slice(0, 10))}</p>
                  {r.status === "pending" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setStatus(r, "approved")}>
                        <Check className="w-4 h-4 text-emerald-600" /> {r.request_type === "cancel" ? "Acknowledge" : "Approve"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setStatus(r, "declined")}>
                        <X className="w-4 h-4 text-red-600" /> {r.request_type === "cancel" ? "Dismiss" : "Decline"}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}