import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";

export default function SupportRequestTiming({ date, onDateChange, timing, onChange, required }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Preferred date</Label>
          <DatePicker value={date} onChange={onDateChange} placeholder="Pick a date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sr-hours">Support hours</Label>
          <Input id="sr-hours" type="number" min="0.01" max="24" step="any" required={required} value={timing.hours} onChange={(e) => onChange({ ...timing, hours: e.target.value })} placeholder="e.g. 2.5" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sr-start">Start time</Label>
          <Input id="sr-start" type="time" required={required} value={timing.start} onChange={(e) => onChange({ ...timing, start: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sr-end">End time</Label>
          <Input id="sr-end" type="time" required={required} value={timing.end} onChange={(e) => onChange({ ...timing, end: e.target.value })} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Hours must match the start and end times. An earlier end time means the following day.</p>
    </div>
  );
}