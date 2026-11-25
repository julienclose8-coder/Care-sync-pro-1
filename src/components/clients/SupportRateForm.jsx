import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SupportRateForm({ existingNames, onAdd, saving }) {
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const duplicate = existingNames.some((item) => item.toLowerCase() === name.trim().toLowerCase());
  const submit = async () => {
    if (!name.trim() || Number(rate) <= 0 || duplicate) return;
    await onAdd({ name: name.trim(), hourly_rate: Number(rate) });
    setName("");
    setRate("");
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_7rem_auto] gap-2 [&>input]:min-w-0">
      <Input aria-label="Support name" placeholder="Support name" value={name} onChange={(event) => setName(event.target.value)} />
      <Input aria-label="Hourly rate" type="number" min="0" step="0.05" placeholder="$/hour" value={rate} onChange={(event) => setRate(event.target.value)} />
      <Button type="button" size="icon" title="Add support" aria-label="Add support" onClick={submit} disabled={saving || !name.trim() || Number(rate) <= 0 || duplicate}>
        <Plus className="w-4 h-4" />
      </Button>
      {duplicate && <p className="col-span-3 text-xs text-destructive">That support already has a rate.</p>}
    </div>
  );
}