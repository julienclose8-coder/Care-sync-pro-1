import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function ShiftGoalsField({ goals, selected = [], onChange }) {
  const active = goals.filter((goal) => goal.status === "active");
  return (
    <div className="space-y-2">
      <Label>Goals for this shift</Label>
      {active.length === 0 ? <p className="text-xs text-muted-foreground">This client has no active goals yet.</p> : active.map((goal) => {
        const checked = selected.includes(goal.id);
        return <label key={goal.id} className="flex items-start gap-2 rounded-lg border p-2.5 text-sm"><Checkbox checked={checked} onCheckedChange={() => onChange(checked ? selected.filter((id) => id !== goal.id) : [...selected, goal.id])} /><span>{goal.title}</span></label>;
      })}
    </div>
  );
}