import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ChevronDown, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePageRefresh } from '@/hooks/usePullToRefresh';

function DocumentList({ docs, emptyLabel }) {
  const [expandedId, setExpandedId] = useState(null);

  if (docs.length === 0)
    return (
      <p className="border border-dashed rounded-xl py-10 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );

  return (
    <div className="space-y-3">
      {docs.map((doc) => (
        <Card key={doc.id} className="border shadow-sm">
          <CardContent className="p-4 space-y-2">
            <button
              className="w-full flex items-start justify-between gap-3 text-left"
              onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
            >
              <span className="min-w-0">
                <span className="block font-semibold">{doc.title}</span>
                <span className="block text-xs text-muted-foreground">{formatDate(doc.created_date)}</span>
              </span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 mt-1 shrink-0 text-muted-foreground transition-transform",
                  expandedId === doc.id && "rotate-180"
                )}
              />
            </button>
            {expandedId === doc.id && doc.content && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap border-t pt-3">
                {doc.content}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function PolicyDocuments() {
  const [docs, setDocs] = useState(null);

  const load = () => base44.entities.PolicyDocument.list("-created_date").then(setDocs);
  usePageRefresh(load);
  useEffect(() => { load().catch(() => setDocs([])); }, []);

  const policies = (docs || []).filter((d) => d.document_type === "policy");
  const procedures = (docs || []).filter((d) => d.document_type !== "policy");

  return (
    <div className="min-h-screen bg-slate-100/70">
      <header className="safe-area-top bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-5 md:py-6 flex items-center gap-4">
          <Link
            to="/"
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <p className="font-heading font-extrabold leading-tight">Policies &amp; procedures</p>
            <p className="text-xs text-slate-300">Set by your organisation</p>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-4 md:p-8">
        {!docs ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="policies">
            <TabsList className="mb-4">
              <TabsTrigger value="policies">Policies</TabsTrigger>
              <TabsTrigger value="procedures">Procedures</TabsTrigger>
            </TabsList>
            <TabsContent value="policies">
              <DocumentList docs={policies} emptyLabel="No policies have been added yet." />
            </TabsContent>
            <TabsContent value="procedures">
              <DocumentList docs={procedures} emptyLabel="No procedures have been added yet." />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}