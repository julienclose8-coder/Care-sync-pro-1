import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { UsersRound, UserRound, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ClientTeamSection({ clientId }) {
  const [members, setMembers] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setMembers(null);
    setError(false);
    base44.functions.invoke("getClientTeam", { client_id: clientId })
      .then(({ data }) => { if (active) setMembers(data.members); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [clientId]);
  return (
    <section aria-labelledby="client-team-heading" data-testid="client-team">
      <h2 id="client-team-heading" className="font-heading font-bold text-lg mb-3 flex items-center gap-2">
        <UsersRound className="w-5 h-5 text-primary" /> My team
      </h2>
      {error ? <p role="alert" className="text-sm text-destructive">Unable to load your team. Please try again later.</p>
        : members === null ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading your team…</p>
        : members.length === 0 ? <p className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">Your support team will appear here once workers are approved.</p>
        : <ul className="grid gap-3 sm:grid-cols-2">
          {members.map((member, index) => <li key={index}>
            <Card className="shadow-sm"><CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0"><UserRound className="w-5 h-5" /></div>
              <div className="min-w-0"><p className="font-semibold break-words" data-team-name>{member.first_name}</p><p className="text-xs text-muted-foreground">Support worker</p></div>
            </CardContent></Card>
          </li>)}
        </ul>}
    </section>
  );
}