import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RecurringShiftFields({ form, onChange }) {
  if (form.id) return null;
  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
      <div className="space-y-1.5">
        <Label>Weekly repeat</Label>
        <Select value={form.recurrence_mode || "none"} onValueChange={(value) => onChange({ recurrence_mode: value })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">One shift only</SelectItem>
            <SelectItem value="end_date">Repeat until an end date</SelectItem>
            <SelectItem value="week_count">Repeat for a number of weeks</SelectItem>
            <SelectItem value="ongoing">Ongoing weekly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {form.recurrence_mode === "end_date" && <div className="space-y-1.5"><Label htmlFor="recurrence-end">Final shift date</Label><Input id="recurrence-end" type="date" min={form.date} value={form.recurrence_end_date || ""} onChange={(e) => onChange({ recurrence_end_date: e.target.value })} required /></div>}
      {form.recurrence_mode === "week_count" && <div className="space-y-1.5"><Label htmlFor="recurrence-count">Number of weeks</Label><Input id="recurrence-count" type="number" min="2" max="104" value={form.recurrence_count || 4} onChange={(e) => onChange({ recurrence_count: e.target.value })} required /></div>}
      {form.recurrence_mode === "ongoing" && <p className="text-xs text-muted-foreground">Creates the next 52 weekly visits. Each visit can be edited separately when a worker is unavailable.</p>}
    </div>
  );
}