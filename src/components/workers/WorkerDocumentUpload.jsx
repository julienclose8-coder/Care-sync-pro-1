import React, { useState } from "react";
import { api } from '@/api/client';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Paperclip, X } from "lucide-react";

export default function WorkerDocumentUpload({ value = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const addFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const uploaded = await Promise.all(files.map(async (file) => {
      const { file_url } = await api.files.upload(file);
      return { name: file.name, file_url, uploaded_date: new Date().toISOString() };
    }));
    onChange([...value, ...uploaded]);
    setUploading(false);
    event.target.value = "";
  };
  return (
    <div className="space-y-2">
      <Label htmlFor="worker-documents">Documents</Label>
      <Input id="worker-documents" type="file" multiple onChange={addFiles} disabled={uploading} />
      {uploading && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Uploading documents…</p>}
      {value.map((document, index) => (
        <div key={`${document.file_url}-${index}`} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
          <Paperclip className="h-4 w-4 text-primary" /><span className="flex-1 truncate">{document.name}</span>
          <button type="button" onClick={() => onChange(value.filter((_, i) => i !== index))} aria-label={`Remove ${document.name}`}><X className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}