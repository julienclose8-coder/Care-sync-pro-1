import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SupportSettingFields from "@/components/supports/SupportSettingFields";
import { SUPPORT_SETTINGS } from "@/lib/supportSettings";

export default function ClientSettingOptions({ form, onChange }) {
  return <div className="space-y-4">
    <SupportSettingFields value={form} onChange={onChange} />
    <p className="text-xs text-muted-foreground">This is the client's usual setting. Individual shifts and requests can use a different setting.</p>
    {Object.entries(SUPPORT_SETTINGS).map(([key, label]) => <div key={key} className="space-y-1.5">
      <Label htmlFor={`services-${key}`}>{label} request choices</Label>
      <Textarea id={`services-${key}`} rows={3} value={(form.setting_supports?.[key] || []).join("\n")} onChange={(e) => onChange({ setting_supports: { ...form.setting_supports, [key]: e.target.value.split("\n") } })} placeholder="One support per line; leave blank for standard choices" />
    </div>)}
    <p className="text-xs text-muted-foreground">These choices appear when the client requests support in that setting. Existing shifts and requests are not changed.</p>
  </div>;
}