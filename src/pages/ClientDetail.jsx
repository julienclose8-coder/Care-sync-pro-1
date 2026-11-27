import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Pencil, Phone, Mail, MapPin, CalendarDays, HeartPulse, Sparkles, ShieldAlert, UserRound } from "lucide-react";
import ClientForm from "@/components/clients/ClientForm";
import GoalsCard from "@/components/clients/GoalsCard";
import HomeSafetyCard from "@/components/clients/HomeSafetyCard";
import NotesCard from "@/components/clients/NotesCard";
import SupportsCard from "@/components/clients/SupportsCard";
import SupportTeamCard from "@/components/clients/SupportTeamCard";
import TrainingRequirementsCard from "@/components/clients/TrainingRequirementsCard";
import BillingCard from "@/components/clients/BillingCard";
import ClientSettingDialog from "@/components/clients/ClientSettingDialog";
import SupportLocationSummary from "@/components/supports/SupportLocationSummary";
import { SUPPORT_SETTINGS, supportSetting } from "@/lib/supportSettings";
import ClientOnboardingCard from '@/components/clients/ClientOnboardingCard';
import ArchiveClientButton from '@/components/clients/ArchiveClientButton';
import { usePageRefresh } from '@/hooks/usePullToRefresh';

const STATUS_STYLES = {
  active: "bg-emerald-100 text-emerald-700",
  on_hold: "bg-amber-100 text-amber-700",
  inactive: "bg-slate-100 text-slate-500",
};

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3">
      <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm whitespace-pre-wrap">{value || "—"}</p>
      </div>
    </div>
  );
}

function ProfileCard({ client }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserRound className="w-4 h-4 text-primary" /> Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <InfoRow icon={Mail} label="Email" value={client.email} />
        <InfoRow icon={Phone} label="Phone" value={client.phone} />
        <InfoRow icon={MapPin} label="Address" value={client.address} />
        <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground">Usual support setting</p><SupportLocationSummary record={client} client={client} /></div>
        <InfoRow icon={CalendarDays} label="Date of birth" value={client.date_of_birth} />
        <InfoRow icon={HeartPulse} label="Support needs" value={client.support_needs} />
        <InfoRow icon={Sparkles} label="Preferences" value={client.preferences} />
        <InfoRow icon={ShieldAlert} label="Emergency contact" value={client.emergency_contact} />
      </CardContent>
    </Card>
  );
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(undefined);
  const [shifts, setShifts] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [formOpen, setFormOpen] = useState(false);

  const loadCore = useCallback(async () => {
    const [c, s, w, profiles] = await Promise.all([
      api.entities.Client.get(id),
      api.entities.Shift.filter({ client_id: id }),
      api.entities.User.list(),
      api.entities.Worker.list().catch(() => []),
    ]);
    setClient(c);
    setShifts(s);
    // Same worker list as the roster: sign-in accounts plus worker profiles added by an admin.
    const accounts = w.filter((u) => u.role !== "admin");
    const accountEmails = new Set(accounts.map((u) => (u.email || "").toLowerCase()).filter(Boolean));
    setWorkers([
      ...accounts.map((u) => ({ ...u, worker_source: "user" })),
      ...profiles
        .filter((p) => !p.email || !accountEmails.has(p.email.toLowerCase()))
        .map((p) => ({ ...p, role: "worker", worker_source: "profile" })),
    ]);
  }, [id]);

  usePageRefresh(loadCore);

  useEffect(() => {
    loadCore().catch(() => setClient(null));
  }, [loadCore]);

  return (
    <div className="safe-area-top min-h-screen bg-muted/40 p-4 md:p-8 [--safe-padding-top:1rem] md:[--safe-padding-top:2rem]">
      {client === undefined && (
        <p className="text-center text-muted-foreground py-20">Loading client…</p>
      )}
      {client === null && (
        <div className="text-center space-y-4 py-20">
          <p className="text-muted-foreground">Client not found.</p>
          <Button variant="outline" onClick={() => navigate("/")}>Back to dashboard</Button>
        </div>
      )}
      {client && (
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 max-w-full">
              <Button variant="ghost" size="sm" className="-ml-2 mb-1 text-muted-foreground" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to dashboard
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="min-w-0 break-words font-heading text-2xl md:text-3xl font-extrabold tracking-tight">{client.full_name}</h1>
                <Badge className={`${STATUS_STYLES[client.status] || ""} border-0`}>
                  {(client.status || "active").replace("_", " ")}
                </Badge>
                {supportSetting(client) && <Badge variant="outline" className="text-primary border-primary/30">{SUPPORT_SETTINGS[supportSetting(client)]}</Badge>}
              </div>
              <p className="text-muted-foreground mt-1">
                {client.funding_type || "Funding not set"}{client.plan_manager ? ` · ${client.plan_manager}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ClientSettingDialog client={client} onSaved={loadCore} />
              <Button variant="outline" onClick={() => setFormOpen(true)}><Pencil className="w-4 h-4 mr-1.5" /> Edit profile</Button>
              <ArchiveClientButton client={client} onSaved={loadCore} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 items-start">
            <div className="min-w-0 lg:col-span-2 space-y-4">
              <ProfileCard client={client} />
              <ClientOnboardingCard client={client} onSaved={loadCore} />
              <TrainingRequirementsCard client={client} onChanged={loadCore} />
              {client.in_home_support && <HomeSafetyCard clientId={client.id} />}
              <GoalsCard clientId={client.id} />
              <NotesCard clientId={client.id} />
            </div>
            <div className="min-w-0 space-y-4">
              <BillingCard client={client} onChanged={loadCore} />
              <SupportsCard client={client} workers={workers} shifts={shifts} onChanged={loadCore} />
              <SupportTeamCard client={client} shifts={shifts} workers={workers} onChanged={loadCore} />
            </div>
          </div>

          <ClientForm open={formOpen} onOpenChange={setFormOpen} initial={client} onSaved={loadCore} />
        </div>
      )}
    </div>
  );
}