import React, { useState } from "react";
import { CalendarClock } from "lucide-react";
import { api } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatTime, todayStr } from "@/lib/format";

export default function VisitDateChangeButton({ client, shift, requests, onSent }) {
  const [open, setOpen] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [outcome, setOutcome] = useState("");
  const [sending, setSending] = useState(false);
  const sent = requests.some((request) => request.request_type === "change" && request.shift_id === shift.id && request.status === "pending");
  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    try {
      await api.entities.SupportRequest.create({ client_id: client.id, shift_id: shift.id, request_type: "change", service_type: shift.service_type || "Other", preferred_times: `${newDate} ${formatTime(newStart)}–${formatTime(newEnd)}`, outcome, details: `Please move the visit on ${formatDate(shift.date)}, ${formatTime(shift.start_time)}–${formatTime(shift.end_time)} to ${formatDate(newDate)}, ${formatTime(newStart)}–${formatTime(newEnd)}.`, status: "pending" });
      await onSent();
      setOpen(false);
      setNewDate("");
      setNewStart("");
      setNewEnd("");
      setOutcome("");
    } finally { setSending(false); }
  };
  if (sent) return <Badge className="bg-amber-100 text-amber-700 border-0">Date change requested</Badge>;
  return <><Button size="sm" variant="outline" onClick={() => setOpen(true)}><CalendarClock className="w-4 h-4" />Change date & time</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Request a new visit date and time</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor={`new-visit-date-${shift.id}`}>Preferred new date</Label><Input id={`new-visit-date-${shift.id}`} type="date" min={todayStr()} value={newDate} onChange={(event) => setNewDate(event.target.value)} required /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor={`new-start-${shift.id}`}>Start time</Label><Input id={`new-start-${shift.id}`} type="time" value={newStart} onChange={(event) => setNewStart(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor={`new-end-${shift.id}`}>End time</Label><Input id={`new-end-${shift.id}`} type="time" value={newEnd} onChange={(event) => setNewEnd(event.target.value)} required /></div></div><div className="space-y-2"><Label htmlFor={`support-outcome-${shift.id}`}>Desired support outcome</Label><Textarea id={`support-outcome-${shift.id}`} value={outcome} onChange={(event) => setOutcome(event.target.value)} placeholder="What would you like this support to help you achieve?" required /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={sending || !newDate || !newStart || !newEnd || !outcome.trim()}>{sending ? "Sending…" : "Send change request"}</Button></DialogFooter></form></DialogContent></Dialog></>;
}