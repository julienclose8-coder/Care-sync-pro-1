import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ClientInfoDialog from "@/components/portals/ClientInfoDialog";

// Clients this worker has been approved to support (admin-approved support team members)
export default function MyClientsSection({ user }) {
  const [clients, setClients] = useState(null);
  const [open, setOpen] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      base44.entities.SupportTeamMember.filter({ worker_id: user.id, status: "approved" }).catch(() => []),
      base44.entities.Client.list().catch(() => []),
    ]).then(([team, all]) => {
      if (cancelled) return;
      const ids = new Set(team.map((t) => t.client_id));
      setClients(all.filter((c) => ids.has(c.id)));
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="font-heading font-bold text-lg">My clients</h2>
      </div>
      {clients === null ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : clients.length === 0 ? (
        <p className="border border-dashed rounded-xl py-8 text-center text-sm text-muted-foreground">
          No approved clients yet — you'll see clients here once the admin approves you for their support team.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {clients.map((c) => (
            <Card key={c.id} className="border shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="font-semibold">{c.full_name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {c.support_needs || "Support needs not stated"}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => setOpen(c)}>
                  View client
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <ClientInfoDialog
        client={open}
        user={user}
        onOpenChange={() => setOpen(null)}
        onSaved={() => setReload((k) => k + 1)}
      />
    </section>
  );
}