import React, { useEffect, useState } from "react";
import { api } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import ClientSettingOptions from "@/components/clients/ClientSettingOptions";
import { settingDefaults, settingPayload } from "@/lib/supportSettings";

export default function ClientSettingDialog({ client, onSaved }) {
  const [open, setOpen] = useState(false), [form, setForm] = useState({}), [saving, setSaving] = useState(false), [error, setError] = useState("");
  useEffect(() => { if (open) { setForm({ ...settingDefaults(client), setting_supports: client.setting_supports || {} }); setError(""); } }, [open, client]);
  const save = async (e) => {
    e.preventDefault();
    if (!form.support_setting) return;
    setSaving(true); setError("");
    try { await api.entities.Client.update(client.id, settingPayload(form)); await onSaved(); setOpen(false); }
    catch (err) { setError(err.message || "Unable to save the support setting."); }
    finally { setSaving(false); }
  };
  return <>
    <Button variant="outline" onClick={() => setOpen(true)}>Assign support setting</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Assign support setting</DialogTitle><DialogDescription>Set the usual location and request choices for {client.full_name}.</DialogDescription></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <ClientSettingOptions form={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving || !form.support_setting}>{saving ? "Saving…" : "Save setting"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}