import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SUPPORT_SETTINGS } from "@/lib/supportSettings";

export default function SupportSettingFields({ value, onChange, editCentre = true }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium mb-2">Support setting *</legend>
      <div className="flex flex-wrap gap-2">
        {Object.entries(SUPPORT_SETTINGS).map(([key, label]) => <Button key={key} type="button" variant={value.support_setting === key ? "default" : "outline"} aria-pressed={value.support_setting === key} onClick={() => onChange({ support_setting: key })}>{label}</Button>)}
      </div>
      {!value.support_setting && <p className="text-xs text-muted-foreground">Choose where this support will take place.</p>}
      {editCentre && value.support_setting === "centre_based" && <div className="space-y-3">
        <div className="space-y-1.5"><Label htmlFor="setting-centre-name">Centre name *</Label><Input id="setting-centre-name" required value={value.centre_name || ""} onChange={(e) => onChange({ centre_name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="setting-centre-address">Centre address</Label><Input id="setting-centre-address" value={value.centre_address || ""} onChange={(e) => onChange({ centre_address: e.target.value })} /></div>
      </div>}
    </fieldset>
  );
}