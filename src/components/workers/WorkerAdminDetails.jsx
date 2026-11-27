import React from "react";
import { api } from "@/api/client";
import { isNativeApp, openExternal } from "@/lib/native";
import { BadgeCheck, Banknote, FileText, Timer } from "lucide-react";

const Row = ({ label, value }) => <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm">{value || "—"}</p></div>;

// Documents are private; open each one through a short-lived signed link.
async function openDocument(fileUrl) {
  if (isNativeApp) {
    try { await openExternal(await api.files.openUrl(fileUrl)); }
    catch { window.alert("This document could not be opened. You may not have access to it."); }
    return;
  }
  const tab = window.open("", "_blank");
  if (tab) tab.opener = null;
  try {
    const url = await api.files.openUrl(fileUrl);
    if (tab) tab.location.href = url; else window.location.href = url;
  } catch {
    tab?.close();
    window.alert("This document could not be opened. You may not have access to it.");
  }
}

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
      {(worker.documents || []).length ? (worker.documents || []).map((document) => <button type="button" key={document.file_url} onClick={() => openDocument(document.file_url)} className="block text-left text-sm text-primary underline">{document.name}</button>) : <p className="text-sm text-muted-foreground">No documents attached.</p>}
      <p className="flex items-center gap-2 text-sm"><BadgeCheck className="h-4 w-4 text-primary" />{(worker.trainings || []).length} training approvals</p>
    </div>
  );
}