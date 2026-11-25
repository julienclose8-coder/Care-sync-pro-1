import React from "react";
import { SUPPORT_SETTINGS, supportSetting } from "@/lib/supportSettings";

export default function SupportLocationSummary({ record, client, showAddress = true }) {
  const setting = supportSetting(record, client);
  if (!setting) return <p className="text-xs text-muted-foreground">Support setting not assigned</p>;
  const centreName = record?.centre_name ?? client?.centre_name;
  const centreAddress = record?.centre_address ?? client?.centre_address;
  return <div className="text-xs text-muted-foreground break-words space-y-1">
    <p className="font-medium text-primary">{SUPPORT_SETTINGS[setting]}{setting === "centre_based" ? ` · ${centreName || "Centre to be confirmed"}` : " · Home visit"}</p>
    {showAddress && <p>{setting === "centre_based" ? (centreAddress || "Centre address to be confirmed") : (client?.address || "Home address to be confirmed")}</p>}
  </div>;
}