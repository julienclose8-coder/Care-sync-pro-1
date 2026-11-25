export const SUPPORT_SETTINGS = { in_home: "In-home", centre_based: "Centre-based" };
export const DEFAULT_SUPPORTS = ["Personal Care", "Domestic Assistance", "Community Access", "Respite", "Transport", "Other"];
export function supportSetting(record, client) {
  return record?.support_setting || client?.support_setting || ((record?.in_home_support || client?.in_home_support) ? "in_home" : "");
}
export function settingDefaults(client) {
  return { support_setting: supportSetting(client), centre_name: client?.centre_name || "", centre_address: client?.centre_address || "" };
}
export function supportsForSetting(client, setting) {
  const configured = (client?.setting_supports?.[setting] || []).map((s) => s.trim()).filter(Boolean);
  return [...new Set(configured.length ? configured : DEFAULT_SUPPORTS)];
}
export function settingPayload(form) {
  return { support_setting: form.support_setting, in_home_support: form.support_setting === "in_home", centre_name: (form.centre_name || "").trim(), centre_address: (form.centre_address || "").trim(), setting_supports: Object.fromEntries(Object.keys(SUPPORT_SETTINGS).map((key) => [key, [...new Set((form.setting_supports?.[key] || []).map((s) => s.trim()).filter(Boolean))]])) };
}