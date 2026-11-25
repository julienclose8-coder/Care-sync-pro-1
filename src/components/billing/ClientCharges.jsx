import React, { useState } from "react";
import { ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { getClientCharges } from "@/lib/clientBilling";
import InvoiceForm from "@/components/billing/InvoiceForm";

export default function ClientCharges({ clients, shifts, invoices, onSaved }) {
  const [selected, setSelected] = useState(null);
  const charges = getClientCharges(clients, shifts, invoices);
  const preset = selected ? {
    client_id: selected.client.id,
    hours: selected.hours,
    hourly_rate: selected.rate,
    shift_ids: selected.supports.map((shift) => shift.id),
    worker_ids: selected.workerIds,
    description: `${selected.supportName} support${selected.from ? ` — ${formatDate(selected.from)} to ${formatDate(selected.to)}` : ""}`,
    notes: selected.workers.length ? `Support workers: ${selected.workers.join(", ")}` : "",
  } : null;

  return <section>
    <h2 className="font-heading font-bold mb-3 flex items-center gap-2"><ReceiptText className="w-4 h-4 text-primary" /> Client invoicing</h2>
    {charges.length === 0 ? <div className="border border-dashed rounded-xl py-10 text-center text-muted-foreground">No completed, uninvoiced client supports.</div> : <div className="space-y-2">
      {charges.map((charge) => <div key={`${charge.client.id}-${charge.supportName}`} className="rounded-2xl border bg-card p-4 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-48"><p className="text-sm font-bold">{charge.client.full_name} · {charge.supportName}</p><p className="text-xs text-muted-foreground">{charge.hours} hrs · {charge.workers.join(", ") || "Worker not assigned"}</p></div>
        <div className="text-right"><p className="text-sm font-semibold">{formatCurrency(charge.hours * charge.rate)}</p><p className="text-xs text-muted-foreground">{charge.rate ? `${formatCurrency(charge.rate)}/hr` : "Support rate not set"}</p></div>
        <Button size="sm" disabled={!charge.rate} onClick={() => setSelected(charge)}>Create invoice</Button>
      </div>)}
    </div>}
    <InvoiceForm open={!!selected} onOpenChange={(open) => !open && setSelected(null)} preset={preset} clients={clients} invoices={invoices} onSaved={() => { setSelected(null); onSaved(); }} />
  </section>;
}