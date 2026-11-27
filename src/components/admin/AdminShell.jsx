import React, { useEffect, useState } from "react";
import { api } from '@/api/client';
import {
  LayoutDashboard, Users, CalendarDays, Wallet, HeartHandshake, LogOut, Loader2, UserCog, ClipboardList, FileText,
  ShieldCheck, ListChecks, Sparkles, Building2,
} from "lucide-react";
import Overview from "./Overview";
import ClientsSection from "@/components/clients/ClientsSection";
import RosterSection from "@/components/roster/RosterSection";
import BillingSection from "@/components/billing/BillingSection";
import WorkersSection from "@/components/workers/WorkersSection";
import RequestsSection from "./RequestsSection";
import LeaveRequestsList from '@/components/leave/LeaveRequestsList';
import { cn } from "@/lib/utils";
import TimeCorrectionsSection from '@/components/timesheets/TimeCorrectionsSection';
import NotesSection from '@/components/admin/NotesSection';
import PolicyDocumentsSection from '@/components/policies/PolicyDocumentsSection';
import StaffAccessSection from '@/components/access/StaffAccessSection';
import RecommendationsSection from '@/components/admin/RecommendationsSection';
import { useNavigate } from 'react-router-dom';
import useAdminTabHistory from '@/hooks/useAdminTabHistory';
import DeleteAccountButton from '@/components/account/DeleteAccountButton';
import { usePageRefresh } from '@/hooks/usePullToRefresh';
import BottomTabBar from '@/components/BottomTabBar';

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "clients", label: "Client Profiles", icon: Users },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "roster", label: "Roster", icon: CalendarDays },
  { id: "recommendations", label: "Staffing", icon: Sparkles },
  { id: "workers", label: "Workers", icon: UserCog },
  { id: "requests", label: "Requests", icon: ClipboardList },
  { id: "policies", label: "Policies", icon: ShieldCheck },
  { id: "procedures", label: "Procedures", icon: ListChecks },
  { id: "billing", label: "Payroll", icon: Wallet },
  { id: "time-corrections", label: "Time corrections", icon: ClipboardList },
  { id: "staff-access", label: "Staff access levels", icon: ShieldCheck },
  { id: "storage", label: "Storage", icon: FileText },
  { id: "complaints", label: "Complaints", icon: ClipboardList },
  { id: "organisation", label: "Organisation", icon: Building2 },
];

export default function AdminShell({ user }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [tabRootVersion, setTabRootVersion] = useState(0);
  const { section, setSection } = useAdminTabHistory(NAV, !!data);

  const loadData = async () => {
    const [clients, shifts, invoices, users, workerProfiles, requests, payments, team, goals] = await Promise.all([
      api.entities.Client.list(),
      api.entities.Shift.list("date"),
      api.entities.Invoice.list("-issue_date"),
      api.entities.User.list().catch(() => []),
      api.entities.Worker.list().catch(() => []),
      api.entities.SupportRequest.list("-created_date"),
      api.entities.WorkerPayment.list("-created_date"),
      api.entities.SupportTeamMember.list().catch(() => []),
      api.entities.Goal.list().catch(() => []),
    ]);
    const workers = [
      ...users.map((worker) => ({ ...worker, worker_source: "user" })),
      ...workerProfiles.map((worker) => ({ ...worker, role: "worker", worker_source: "profile" })),
    ];
    setData({ clients, shifts, invoices, workers, requests, payments, team, goals });
  };

  usePageRefresh(loadData);

  useEffect(() => {
    loadData().catch(() => setData({ clients: [], shifts: [], invoices: [], workers: [], requests: [], payments: [], team: [], goals: [] }));
  }, []);

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="hidden md:flex fixed top-0 bottom-0 left-0 w-64 flex-col border-r bg-card p-5 z-10">
        <div className="flex items-center gap-3 px-1 pb-8">
          <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-heading font-extrabold leading-tight">Support Hub</p>
            <p className="text-xs text-muted-foreground">Care &amp; rostering</p>
          </div>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto space-y-1">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => ['storage', 'complaints', 'staff-access', 'organisation'].includes(id) ? navigate(`/${id}`) : setSection(id)}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                section === id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </nav>
        <div className="border-t pt-4 space-y-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{user?.full_name || "Admin"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => api.auth.logout()}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
          <DeleteAccountButton className="justify-start px-0 text-destructive" />
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="safe-area-top sticky top-0 z-10 bg-background/80 backdrop-blur border-b md:hidden px-4 py-3">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <p className="font-heading font-extrabold">Support Hub</p>
            <DeleteAccountButton className="ml-auto px-2 text-xs text-destructive" />
            <button onClick={() => api.auth.logout()} className="ml-auto text-muted-foreground">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <nav aria-label="Mobile management sections" className="admin-mobile-nav flex gap-2 overflow-x-auto no-scrollbar">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => ['storage', 'complaints', 'staff-access', 'organisation'].includes(id) ? navigate(`/${id}`) : setSection(id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                  section === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </nav>
        </header>

        <main key={`${section}:${tabRootVersion}`} className="admin-content p-4 md:p-10 max-w-6xl">
          {!data ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {section === "overview" && <Overview data={data} onNavigate={setSection} onChanged={loadData} />}
              {section === "clients" && <ClientsSection data={data} onChanged={loadData} />}
              {section === "notes" && <NotesSection data={data} onChanged={loadData} />}
              {section === "roster" && <RosterSection data={data} onChanged={loadData} />}
              {section === "recommendations" && <RecommendationsSection />}
              {section === "workers" && <WorkersSection data={data} onChanged={loadData} />}
              {section === "requests" && <div className="space-y-8"><LeaveRequestsList manager /><RequestsSection data={data} onChanged={loadData} /></div>}
              {section === "billing" && <BillingSection data={data} onChanged={loadData} />}
              {section === "time-corrections" && <TimeCorrectionsSection onChanged={loadData} />}
              {section === "policies" && <PolicyDocumentsSection documentType="policy" typeLabel="Policy" />}
              {section === "procedures" && <PolicyDocumentsSection documentType="procedure" typeLabel="Procedure" />}
              {section === "staff-access" && <StaffAccessSection />}
            </>
          )}
        </main>
      </div>
      <BottomTabBar section={section} items={NAV} onReselect={() => setTabRootVersion(version => version + 1)} onNavigate={id => ['storage', 'complaints', 'staff-access', 'organisation'].includes(id) ? navigate(`/${id}`) : setSection(id)} />
    </div>
  );
}