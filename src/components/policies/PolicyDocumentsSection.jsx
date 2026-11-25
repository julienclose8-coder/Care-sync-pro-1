import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, ChevronDown, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PolicyDocumentForm from "./PolicyDocumentForm";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import useAdminViewState from '@/hooks/useAdminViewState';

export default function PolicyDocumentsSection({ documentType, typeLabel }) {
  const typeLabelPlural = typeLabel === "Policy" ? "Policies" : "Procedures";
  const [docs, setDocs] = useState(null);
  const [expandedId, setExpandedId] = useAdminViewState(`${documentType}:expanded`, null);
  const [confirmId, setConfirmId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const list = await base44.entities.PolicyDocument.filter({ document_type: documentType }, "-created_date");
    setDocs(list);
  };

  useEffect(() => {
    load().catch(() => setDocs([]));
  }, [documentType]);

  const remove = async (doc) => {
    await base44.entities.PolicyDocument.delete(doc.id);
    setConfirmId(null);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading font-bold text-2xl">{typeLabelPlural}</h1>
          <p className="text-sm text-muted-foreground">
            Add and manage {typeLabelPlural.toLowerCase()} your workers can read.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4" /> Add {typeLabel.toLowerCase()}
        </Button>
      </div>

      {!docs ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : docs.length === 0 ? (
        <p className="border border-dashed rounded-xl py-10 text-center text-sm text-muted-foreground">
          No {typeLabel.toLowerCase()}s yet. Add your first one.
        </p>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <Card key={doc.id} className="border shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">Added {formatDate(doc.created_date)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditing(doc); setFormOpen(true); }}>
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Button>
                    {confirmId === doc.id ? (
                      <Button size="sm" variant="destructive" onClick={() => remove(doc)}>
                        Confirm delete
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmId(doc.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </Button>
                    )}
                  </div>
                </div>
                {doc.content && (
                  <>
                    <p
                      className={cn(
                        "text-sm text-muted-foreground whitespace-pre-wrap",
                        expandedId !== doc.id && "line-clamp-3"
                      )}
                    >
                      {doc.content}
                    </p>
                    <button
                      className="text-xs font-medium text-primary"
                      onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                    >
                      {expandedId === doc.id ? "Show less" : "Show more"}
                    </button>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PolicyDocumentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        documentType={documentType}
        typeLabel={typeLabel}
        existing={editing}
        onSaved={load}
      />
    </div>
  );
}