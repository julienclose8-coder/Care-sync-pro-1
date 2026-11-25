import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TRAININGS } from "@/lib/trainings";

export default function WorkerTrainingFields({ value = [], onChange }) {
  const toggle = (training, checked) => onChange(
    checked ? [...new Set([...value, training])] : value.filter((item) => item !== training)
  );

  return (
    <div className="space-y-2">
      <Label>Approved training</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {TRAININGS.map((training) => (
          <label key={training} className="flex items-center gap-2 rounded-lg border p-2 text-sm cursor-pointer">
            <Checkbox checked={value.includes(training)} onCheckedChange={(checked) => toggle(training, !!checked)} />
            <span>{training}</span>
          </label>
        ))}
      </div>
    </div>
  );
}