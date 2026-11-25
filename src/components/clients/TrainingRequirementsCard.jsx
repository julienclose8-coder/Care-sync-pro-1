import React, { useEffect, useState } from "react";
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GraduationCap } from "lucide-react";
import { TRAININGS } from "@/lib/trainings";

export default function TrainingRequirementsCard({ client, onChanged }) {
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected(client.training_requirements || []);
  }, [client.id, client.training_requirements]);

  const toggle = (t, checked) =>
    setSelected((s) => (checked ? [...s, t] : s.filter((x) => x !== t)));

  const save = async () => {
    setSaving(true);
    try {
      await api.entities.Client.update(client.id, { training_requirements: selected });
      if (onChanged) onChanged();
    } finally {
      setSaving(false);
    }
  };

  const dirty = JSON.stringify([...selected].sort()) !== JSON.stringify([...(client.training_requirements || [])].sort());
  const firstName = (client.full_name || "this client").split(" ")[0];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="w-4 h-4 text-primary" /> Support requirements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Workers rostered for {firstName} must have every ticked training approved in their worker profile first.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {TRAININGS.map((t) => (
            <label
              key={t}
              className="flex items-center gap-2.5 text-sm rounded-lg border px-3 py-2 cursor-pointer hover:bg-muted/50"
            >
              <Checkbox checked={selected.includes(t)} onCheckedChange={(v) => toggle(t, !!v)} />
              {t}
            </label>
          ))}
        </div>
        <Button size="sm" disabled={saving || !dirty} onClick={save}>
          {saving ? "Saving…" : "Save requirements"}
        </Button>
      </CardContent>
    </Card>
  );
}