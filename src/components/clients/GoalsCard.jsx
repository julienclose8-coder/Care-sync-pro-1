import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Target } from "lucide-react";
import { formatDate } from "@/lib/format";

const STATUS_STYLES = {
  active: "bg-teal-100 text-teal-700",
  achieved: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
};

const EMPTY = { title: "", description: "", status: "active", target_date: "" };

export default function GoalsCard({ clientId }) {
  const [goals, setGoals] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    base44.entities.Goal.filter({ client_id: clientId }, "-created_date")
      .then(setGoals)
      .catch(() => setGoals([]));
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const openForm = (goal) => {
    setEditing(goal || null);
    setForm(goal ? { ...goal } : EMPTY);
    setOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { id, created_date, updated_date, created_by_id, client_id, ...payload } = form;
      if (editing?.id) await base44.entities.Goal.update(editing.id, payload);
      else await base44.entities.Goal.create({ ...payload, client_id: clientId });
      setOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (goal) => {
    if (!window.confirm(`Delete goal "${goal.title}"?`)) return;
    await base44.entities.Goal.delete(goal.id);
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="w-4 h-4 text-primary" /> Goals
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => openForm(null)}>
          <Plus className="w-4 h-4 mr-1" /> Add goal
        </Button>
      </CardHeader>
      <CardContent>
        {goals === null ? (
          <p className="text-sm text-muted-foreground">Loading goals…</p>
        ) : goals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No goals yet — add what this client wants to work towards.
          </p>
        ) : (
          <div className="space-y-3">
            {goals.map((g) => (
              <div key={g.id} className="rounded-xl border px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{g.title}</p>
                    {g.description && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{g.description}</p>}
                    {g.target_date && (
                      <p className="text-xs text-muted-foreground mt-1.5">Target: {formatDate(g.target_date)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge className={`${STATUS_STYLES[g.status] || ""} border-0`}>{g.status}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openForm(g)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(g)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit goal" : "Add goal"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="goal_title">Goal *</Label>
              <Input id="goal_title" required value={form.title || ""}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Build confidence using public transport" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal_description">Details</Label>
              <Textarea id="goal_description" rows={3} value={form.description || ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What does success look like, and how will supports help?" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="goal_target">Target date</Label>
                <Input id="goal_target" type="date" value={form.target_date || ""}
                  onChange={(e) => setForm((f) => ({ ...f, target_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status || "active"} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="achieved">Achieved</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.title}>
                {saving ? "Saving…" : editing?.id ? "Save changes" : "Add goal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}