import React, { useEffect, useState } from "react";
import { api } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertTriangle, HousePlus, Save } from "lucide-react";
import { formatDate, todayStr } from "@/lib/format";

const CHECKLIST = [
  { key: "smoke_alarms_ok", label: "Smoke alarms installed & tested" },
  { key: "pathways_clear", label: "Walkways & exits are clear" },
  { key: "electrical_safe", label: "Electrical cords & outlets safe" },
  { key: "bathroom_safe", label: "Bathroom safety in place (rails, non-slip)" },
  { key: "medications_secured", label: "Medications stored securely" },
];

const EMPTY = {
  access_details: "", pets: "", hazard_notes: "", other_notes: "",
  smoke_alarms_ok: false, pathways_clear: false, electrical_safe: false,
  bathroom_safe: false, medications_secured: false,
};

export default function HomeSafetyCard({ clientId }) {
  const [record, setRecord] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.entities.HomeAssessment.filter({ client_id: clientId })
      .then((rows) => {
        const r = rows[0] || null;
        setRecord(r);
        setForm(r ? { ...EMPTY, ...r } : EMPTY);
      })
      .catch(() => setForm(EMPTY))
      .finally(() => setLoading(false));
  }, [clientId]);

  const checkedCount = CHECKLIST.filter((c) => form[c.key]).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { id, created_date, updated_date, created_by_id, ...rest } = form;
      const payload = { ...rest, client_id: clientId, last_reviewed: todayStr() };
      if (record) {
        await api.entities.HomeAssessment.update(record.id, payload);
      } else {
        const created = await api.entities.HomeAssessment.create(payload);
        setRecord(created);
      }
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HousePlus className="w-4 h-4 text-primary" /> Home & hazard checklist
          </CardTitle>
          {record?.last_reviewed && (
            <span className="text-xs text-muted-foreground">Reviewed {formatDate(record.last_reviewed)}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading home details…</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="access_details">How workers enter the home</Label>
                <Input id="access_details" value={form.access_details || ""}
                  onChange={(e) => setForm((f) => ({ ...f, access_details: e.target.value }))}
                  placeholder="e.g. key lockbox at front door — code with office" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pets">Pets in the home</Label>
                <Input id="pets" value={form.pets || ""}
                  onChange={(e) => setForm((f) => ({ ...f, pets: e.target.value }))}
                  placeholder="e.g. friendly dog, keep gate closed" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Safety checklist</p>
                <span className="text-xs text-muted-foreground">{checkedCount} of {CHECKLIST.length} checked</span>
              </div>
              <div className="space-y-2">
                {CHECKLIST.map((item) => {
                  const ok = !!form[item.key];
                  return (
                    <label key={item.key} htmlFor={item.key}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer hover:bg-accent/50">
                      <Checkbox
                        id={item.key}
                        checked={ok}
                        onCheckedChange={(v) => setForm((f) => ({ ...f, [item.key]: v === true }))}
                      />
                      <span className="text-sm flex-1">{item.label}</span>
                      {ok ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hazard_notes">Known hazards & risks</Label>
              <Textarea id="hazard_notes" rows={3} value={form.hazard_notes || ""}
                onChange={(e) => setForm((f) => ({ ...f, hazard_notes: e.target.value }))}
                placeholder="Anything workers need to watch out for — steps, equipment, behaviours of concern…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="other_notes">Other home notes</Label>
              <Textarea id="other_notes" rows={2} value={form.other_notes || ""}
                onChange={(e) => setForm((f) => ({ ...f, other_notes: e.target.value }))}
                placeholder="House layout, parking, neighbour arrangements…" />
            </div>

            <div className="flex items-center justify-end gap-3">
              {justSaved && <span className="text-xs text-emerald-600 font-medium">Saved</span>}
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-1.5" /> {saving ? "Saving…" : "Save checklist"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}