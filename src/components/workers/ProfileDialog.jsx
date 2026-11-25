import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import DeleteAccountButton from '@/components/account/DeleteAccountButton';

export default function ProfileDialog({ open, onOpenChange, onSaved, onRequestLeave }) {
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    base44.auth
      .me()
      .then((me) => {
        setPhone(me.phone || "");
        setAddress(me.address || "");

      })
      .catch(() => {});
  }, [open]);



  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.auth.updateMe({ phone, address });
      onOpenChange(false);
      if (onSaved) onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>My profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="worker-phone">Phone</Label>
            <Input id="worker-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your contact number" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="worker-address">Address</Label>
            <Input id="worker-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Your address" />
          </div>
          <div className="space-y-2">
            <Label>Leave &amp; unavailability</Label>
            <p className="text-xs text-muted-foreground">Apply for whole days or specific dates and times, subject to manager approval.</p>
            <Button type="button" variant="outline" className="w-full whitespace-normal" onClick={() => { onOpenChange(false); onRequestLeave(); }}>Apply for leave / unavailability</Button>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
          </DialogFooter>
        </form>
        <div className="border-t pt-3"><DeleteAccountButton /></div>
      </DialogContent>
    </Dialog>
  );
}