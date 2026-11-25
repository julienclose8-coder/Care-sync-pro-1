import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function PolicyDocumentForm({ open, onOpenChange, documentType, typeLabel, existing, onSaved }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(existing?.title || "");
      setContent(existing?.content || "");
      setError("");
    }
  }, [open, existing]);

  const save = async () => {
    if (!title.trim()) {
      setError("Please add a title.");
      return;
    }
    setSaving(true);
    try {
      const payload = { title: title.trim(), content: content.trim(), document_type: documentType };
      if (existing) {
        await base44.entities.PolicyDocument.update(existing.id, payload);
      } else {
        await base44.entities.PolicyDocument.create(payload);
      }
      onOpenChange(false);
      onSaved?.();
    } catch {
      setError("Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? `Edit ${typeLabel.toLowerCase()}` : `Add ${typeLabel.toLowerCase()}`}</DialogTitle>
          <DialogDescription>
            {existing ? "Update this" : "Workers will be able to read this"} {typeLabel.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="policy-title">Title</Label>
            <Input
              id="policy-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`${typeLabel} title`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="policy-content">Details</Label>
            <Textarea
              id="policy-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Write the ${typeLabel.toLowerCase()} here…`}
              className="min-h-40"
            />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : existing ? "Save changes" : `Add ${typeLabel.toLowerCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}