import React, { useEffect, useState } from "react";
import CareNotesWorkspace from '@/components/notes/CareNotesWorkspace';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Phone, Mail, MapPin, CalendarDays, HeartPulse, Sparkles, ShieldAlert, FileText } from "lucide-react";
import { formatDate } from "@/lib/format";

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

export default function ClientDetailDialog({ client, onClose, onEdit }) {


  return (
    <Dialog open={!!client} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {client && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between gap-3 pr-6">
                <span className="truncate">{client.full_name}</span>
                <Badge className="border-0">{(client.status || "active").replace("_", " ")}</Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <InfoRow icon={Mail} label="Email" value={client.email} />
              <InfoRow icon={Phone} label="Phone" value={client.phone} />
              <InfoRow icon={MapPin} label="Address" value={client.address} />
              <InfoRow icon={CalendarDays} label="Date of birth" value={client.date_of_birth} />
              <InfoRow icon={Sparkles} label={`Funding — ${client.funding_type || "not set"}`} value={client.plan_manager} />
              <InfoRow icon={HeartPulse} label="Support needs" value={client.support_needs} />
              <InfoRow icon={HeartPulse} label="Disability details" value={client.disability_info} />

              <InfoRow icon={ShieldAlert} label="Emergency contact" value={client.emergency_contact} />
            </div>

            <div className="pt-2"><h3 className="font-heading font-semibold text-sm mb-3">Client notes</h3><CareNotesWorkspace clientId={client.id} clientName={client.full_name} /></div>

            <Button className="w-full mt-4" onClick={() => onEdit(client)}>
              <Pencil className="w-4 h-4 mr-1.5" /> Edit profile
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}