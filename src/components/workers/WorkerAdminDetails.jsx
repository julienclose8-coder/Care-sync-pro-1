import React from "react";
import { BadgeCheck, Banknote, FileText, Timer } from "lucide-react";

const Row = ({ label, value }) => <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm">{value || "—"}</p></div>;

export default function WorkerAdminDetails({ worker }) {
  return (
    <div className="space-y-4 border-t pt-4">
      <h3 className="flex items-center gap-2 font-heading text-sm font-semibold"><Banknote className="h-4 w-4 text-primary" />Pay account</h3>
      <div className="grid grid-cols-2 gap-3">
        <Row label="Account name" value={worker.pay_account_name} />
        <Row label="Payroll reference" value={worker.payroll_reference} />
        <Row label="BSB" value={worker.bsb} />
        <Row label="Account number" value={worker.account_number} />
      </div>
      <h3 className="flex items-center gap-2 font-heading text-sm font-semibold"><Timer className="h-4 w-4 text-primary" />Weekly hours</h3>
      <Row label="Rostering rule" value={`${worker.weekly_hour_limit ?? 38} hours · ${worker.hour_limit_action === "block" ? "Block shifts over limit" : "Show warning over limit"}`} />
      <h3 className="flex items-center gap-2 font-heading text-sm font-semibold"><FileText className="h-4 w-4 text-primary" />Documents</h3>
      {(worker.documents || []).length ? (worker.documents || []).map((document) => <a key={document.file_url} href={document.file_url} target="_blank" rel="noreferrer" className="block text-sm text-primary underline">{document.name}</a>) : <p className="text-sm text-muted-foreground">No documents attached.</p>}
      <p className="flex items-center gap-2 text-sm"><BadgeCheck className="h-4 w-4 text-primary" />{(worker.trainings || []).length} training approvals</p>
    </div>
  );
}