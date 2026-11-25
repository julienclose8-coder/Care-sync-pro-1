import React from "react";
import { Button } from "@/components/ui/button";

const OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "worker", label: "Worker" },
  { value: "client", label: "Client" },
];

// Owner-only helper: lets an admin flip between the three portal UIs
export default function PreviewSwitcher({ value, onChange }) {
  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-full border bg-background/95 px-1.5 py-1.5 shadow-lg backdrop-blur ${value === 'admin' ? 'preview-admin' : ''}`}>
      <span className="pl-1.5 pr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Preview
      </span>
      {OPTIONS.map((o) => (
        <Button
          key={o.value}
          size="sm"
          variant={value === o.value ? "default" : "ghost"}
          className="h-7 rounded-full px-3 text-xs"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}