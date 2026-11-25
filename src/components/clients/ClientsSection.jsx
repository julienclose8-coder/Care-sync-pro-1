import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from '@/api/client';
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ClientForm from "./ClientForm";
import ClientOnboardingDialog from '@/components/clients/ClientOnboardingDialog';
import useAdminViewState from '@/hooks/useAdminViewState';

const STATUS_STYLES = {
  active: "bg-emerald-100 text-emerald-700",
  on_hold: "bg-amber-100 text-amber-700",
  inactive: "bg-slate-100 text-slate-500",
};

export default function ClientsSection({ data, onChanged }) {
  const { clients } = data;
  const [query, setQuery] = useAdminViewState('clients:search', '');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const navigate = useNavigate();

  const filtered = clients.filter((c) =>
    `${c.full_name} ${c.email || ""}`.toLowerCase().includes(query.toLowerCase())
  );

  const handleDelete = async (client) => {
    if (!window.confirm(`Delete ${client.full_name}? This can't be undone.`)) return;
    await api.entities.Client.delete(client.id);
    onChanged();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight">Client Profiles</h1>
          <p className="text-muted-foreground mt-1">
            {clients.length} client{clients.length === 1 ? "" : "s"} in your care — click a client to open their full profile
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-1.5" /> Add client
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients…"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed rounded-xl py-14 text-center text-muted-foreground">
          {clients.length === 0
            ? "No clients yet — add your first client to get started."
            : "No clients match your search."}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/clients/${c.id}`)}
              className="cursor-pointer rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{c.full_name}</p>
                  <p className="text-sm text-muted-foreground truncate">{c.email || c.phone || "—"}</p>
                </div>
                <Badge className={`${STATUS_STYLES[c.status] || ""} border-0`}>
                  {(c.status || "active").replace("_", " ")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-3">{c.funding_type || "Funding not set"}</p>
              <div className="flex gap-1 mt-3">
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditing(c); setFormOpen(true); }}>
                  <Pencil className="w-4 h-4" /> Edit
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(c); }}>
                  <Trash2 className="w-4 h-4" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing ? <ClientForm open={formOpen} onOpenChange={setFormOpen} initial={editing} onSaved={onChanged} /> : <ClientOnboardingDialog open={formOpen} onOpenChange={setFormOpen} onSaved={onChanged} />}
    </div>
  );
}