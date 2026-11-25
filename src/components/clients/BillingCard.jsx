import React, { useEffect, useState } from "react";
import { ReceiptText, Trash2 } from "lucide-react";
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import SupportRateForm from "@/components/clients/SupportRateForm";

export default function BillingCard({ client, onChanged }) {
  const [defaultRate, setDefaultRate] = useState(String(client.hourly_charge_rate || ""));
  const [saving, setSaving] = useState(false);
  useEffect(() => setDefaultRate(String(client.hourly_charge_rate || "")), [client.hourly_charge_rate]);
  const save = async (patch) => {
    setSaving(true);
    await api.entities.Client.update(client.id, patch);
    await onChanged();
    setSaving(false);
  };
  const rates = client.support_rates || [];

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><ReceiptText className="w-4 h-4 text-primary" /> Billing</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div><p className="text-xs font-medium text-muted-foreground mb-1.5">Default hourly rate</p><div className="flex gap-2"><Input className="min-w-0" aria-label="Default hourly rate" type="number" min="0" step="0.05" value={defaultRate} onChange={(event) => setDefaultRate(event.target.value)} /><Button type="button" variant="outline" onClick={() => save({ hourly_charge_rate: Number(defaultRate) || 0 })} disabled={saving}>Save</Button></div></div>
        <div className="space-y-2"><p className="text-xs font-medium text-muted-foreground">Custom support rates</p>{rates.map((rate) => <div key={rate.name} className="flex items-center gap-2 rounded-lg border px-3 py-2"><span className="flex-1 text-sm font-medium">{rate.name}</span><span className="text-sm">{formatCurrency(rate.hourly_rate)}/hr</span><Button type="button" size="icon" variant="ghost" aria-label={`Remove ${rate.name}`} onClick={() => save({ support_rates: rates.filter((item) => item.name !== rate.name) })} disabled={saving}><Trash2 className="w-4 h-4 text-destructive" /></Button></div>)}</div>
        <SupportRateForm existingNames={rates.map((rate) => rate.name)} saving={saving} onAdd={(rate) => save({ support_rates: [...rates, rate] })} />
      </CardContent>
    </Card>
  );
}