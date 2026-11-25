import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { HeartHandshake, LogIn, LogOut, Loader2, FileText, UserRound, BookOpen, ThermometerSun, Siren } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime, workedHours } from "@/lib/format";
import NoteDialog from "@/components/notes/CareNoteDialog";
import ProfileDialog from "@/components/workers/ProfileDialog";
import LeaveRequestDialog from '@/components/leave/LeaveRequestDialog';
import MyClientsSection from "@/components/portals/MyClientsSection";
import { Link } from 'react-router-dom';
import ComplaintPortalLink from '@/components/complaints/ComplaintPortalLink';
import { usePageRefresh } from '@/hooks/usePullToRefresh';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import RosterAcknowledgements from '@/components/roster/RosterAcknowledgements';
import CallInSickDialog from '@/components/portals/CallInSickDialog';

export default function WorkerPortal({ user }) {
  const [shifts, setShifts] = useState(null);
  const [clientMap, setClientMap] = useState({});
  const [notes, setNotes] = useState([]);
  const [noteFor, setNoteFor] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [clockBusy, setClockBusy] = useState(false);
  const [clockError, setClockError] = useState('');
  const [sickFor, setSickFor] = useState(null);

  const load = async () => {
    const [all, clients, myNotes] = await Promise.all([
      base44.entities.Shift.filter({ worker_id: user.id }, "date"),
      base44.entities.Client.list().catch(() => []),
      base44.entities.CareNote.filter({ author_id: user.id }, "-created_date").catch(() => []),
    ]);
    setShifts(all);
    setClientMap(Object.fromEntries(clients.map((c) => [c.id, c])));
    setNotes(myNotes);
  };

  usePageRefresh(load);

  useEffect(() => {
    load().catch(() => setShifts([]));
    const unsubscribe = base44.entities.Shift.subscribe(() => load().catch(() => {}));
    return unsubscribe;
  }, []);

  const notesByShift = Object.fromEntries([...notes].reverse().filter((n) => n.shift_id).map((n) => [n.shift_id, n]));

  if (!shifts)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const upcoming = shifts.filter((s) => s.status === "scheduled" && (s.date >= today || (s.clock_in && !s.clock_out))).sort((a, b) => Number(!!b.clock_in) - Number(!!a.clock_in) || (a.date + a.start_time).localeCompare(b.date + b.start_time));
  const cancelled = shifts.filter((s) => s.status === "cancelled" && s.date >= today).sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
  const completed = shifts.filter((s) => s.status === "completed");
  const hoursDone = completed.reduce((sum, s) => sum + workedHours(s), 0);

  const clock = async (shift, direction) => {
    setClockBusy(true); setClockError('');
    try { await base44.functions.invoke('workerTimesheet', { action: 'clock', shift_id: shift.id, direction }); await load(); }
    catch (err) { setClockError(err.response?.data?.error || 'Unable to record your time. Please try again.'); }
    finally { setClockBusy(false); }
  };

  return (
    <div className="min-h-screen bg-slate-100/70">
      <header className="safe-area-top bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-5 md:py-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center shrink-0">
                <HeartHandshake className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-heading font-extrabold leading-tight truncate">{user.full_name || user.email}</p>
                <p className="text-xs text-slate-300">Support worker</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="border-0 bg-white/10 text-white hover:bg-white/20 hover:text-white" asChild>
                <Link to="/policies"><BookOpen className="w-4 h-4" /> Policies</Link>
              </Button>
              <Button size="sm" className="border-0 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => setProfileOpen(true)}>
                <UserRound className="w-4 h-4" /> My profile
              </Button>
              <Button size="sm" className="border-0 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => base44.auth.logout()}>
                <LogOut className="w-4 h-4" /> Sign out
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/10 px-4 py-3">
              <p className="text-xs text-slate-300">Upcoming shifts</p>
              <p className="font-heading text-2xl font-extrabold">{upcoming.length}</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3">
              <p className="text-xs text-slate-300">Hours completed</p>
              <p className="font-heading text-2xl font-extrabold">{hoursDone}</p>
            </div>
          </div>
        </div>
      </header>

      <PullToRefresh as="main" onRefresh={load} className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        <RosterAcknowledgements workerId={user.id} onChanged={load} />
        <Button variant="outline" className="w-full sm:w-auto whitespace-normal" onClick={() => setLeaveOpen(true)}>Apply for leave / unavailability</Button>
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3"><h2 className="font-heading font-bold text-lg">Upcoming shifts</h2><Button asChild variant="outline"><Link to={`/timesheet?worker_id=${encodeURIComponent(user.id)}`}>My timesheet</Link></Button></div>
          {upcoming.length === 0 ? (
            <p className="border border-dashed rounded-xl py-10 text-center text-sm text-muted-foreground">
              No upcoming shifts on your roster.
            </p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((s) => (
                <Card key={s.id} className={`border shadow-sm ${s.needs_replacement ? 'border-destructive/60 bg-destructive/5' : ''}`}>
                  <CardContent className="p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div className="min-w-28">
                      <p className="text-sm font-semibold">{formatDate(s.date)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(s.start_time)} – {formatTime(s.end_time)}
                      </p>
                    </div>
                    <div className="flex-1 min-w-40">
                      <p className="text-sm font-medium">{clientMap[s.client_id]?.full_name || "Client"}</p>
                      <p className="text-xs text-muted-foreground">{s.service_type || "Support"}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {s.needs_replacement ? (
                        <Badge className="bg-destructive text-white border-0">
                          <Siren className="w-3.5 h-3.5 mr-1" /> Replacement being arranged
                        </Badge>
                      ) : s.clock_in ? (
                        <>
                          <Badge className="bg-teal-100 text-teal-800 border-0">
                            In {formatTime(s.clock_in)}
                          </Badge>
                          <Button size="sm" disabled={clockBusy} onClick={() => clock(s, 'out')}>
                            <LogOut className="w-4 h-4 mr-1" /> Clock out
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" disabled={clockBusy || s.date !== today} title={s.date !== today ? 'Clock-in opens on the support day' : undefined} onClick={() => clock(s, 'in')}>
                          <LogIn className="w-4 h-4 mr-1" /> Clock in
                        </Button>
                      )}
                      {!s.needs_replacement && s.status === 'scheduled' && (
                        <Button size="sm" variant="outline" onClick={() => setSickFor(s)}>
                          <ThermometerSun className="w-4 h-4 mr-1" /> Call in sick
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setNoteFor(s)}>
                        <FileText className="w-4 h-4 mr-1" /> {notesByShift[s.id] ? "Edit note" : "Add note"}
                      </Button>
                    </div>
                    {notesByShift[s.id] && (
                      <p className="w-full text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 whitespace-pre-wrap">
                        {notesByShift[s.id].content}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {cancelled.length > 0 && (
          <section>
            <h2 className="font-heading font-bold text-lg mb-3">Cancelled visits</h2>
            <div className="space-y-2">
              {cancelled.map((s) => (
                <Card key={s.id} data-cancelled-shift={s.id} className="border-red-200 bg-red-50 shadow-sm">
                  <CardContent className="p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div className="min-w-28">
                      <p className="text-sm font-semibold">{formatDate(s.date)}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(s.start_time)} – {formatTime(s.end_time)}</p>
                    </div>
                    <div className="flex-1 min-w-40">
                      <p className="text-sm font-medium">{clientMap[s.client_id]?.full_name || "Client"}</p>
                      <p className="text-xs text-muted-foreground">{s.service_type || "Support"}</p>
                    </div>
                    <Badge className="bg-red-600 text-white border-0">Cancelled by client</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {clockError && <p role="alert" className="text-sm text-destructive">{clockError}</p>}
        <MyClientsSection user={user} />
        <ComplaintPortalLink type="internal" />

        <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} onRequestLeave={() => setLeaveOpen(true)} />
        <LeaveRequestDialog open={leaveOpen} onOpenChange={setLeaveOpen} workerId={user.id} />
        <NoteDialog
          open={!!noteFor}
          onOpenChange={(open) => !open && setNoteFor(null)}
          shift={noteFor}
          client={noteFor ? clientMap[noteFor.client_id] : null}
          clientName={noteFor ? clientMap[noteFor.client_id]?.full_name || "Client" : ""}
          existing={noteFor ? notesByShift[noteFor.id] : null}
          user={user}
          onSaved={load}
        />
        <CallInSickDialog
          open={!!sickFor}
          onOpenChange={(open) => !open && setSickFor(null)}
          shift={sickFor}
          client={sickFor ? clientMap[sickFor.client_id] : null}
          onDone={load}
        />
      </PullToRefresh>
    </div>
  );
}