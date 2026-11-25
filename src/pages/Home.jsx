import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import WorkerPortal from "@/components/portals/WorkerPortal";
import ClientPortal from "@/components/portals/ClientPortal";
import PreviewSwitcher from "@/components/PreviewSwitcher";
import RoleSettingsLink from '@/components/access/RoleSettingsLink';

export default function Home() {
  const [view, setView] = useState(null);
  const [preview, setPreview] = useState(null); // admin only: 'worker' | 'client'
  const [demoData, setDemoData] = useState(null);

  useEffect(() => {
    const resolve = async () => {
      const me = await base44.auth.me();
      if (me.role === "admin") return setView({ type: "admin", user: me });
      const clients = await base44.entities.Client.filter({ email: me.email });
      if (clients.length > 0) return setView({ type: "client", user: me, client: clients[0] });
      setView({ type: "worker", user: me });
    };
    resolve().catch(() => setView({ type: "worker", user: { id: "", email: "", full_name: "" } }));
  }, []);

  // Owner-only preview switching between the three portal UIs
  const handlePreview = async (mode) => {
    if (mode === "admin") return setPreview(null);
    if (mode === "worker") {
      const users = await base44.entities.User.list().catch(() => []);
      const worker = users.find((u) => u.role !== "admin") || view.user;
      setDemoData((d) => ({ ...(d || {}), worker }));
      setPreview("worker");
    }
    if (mode === "client") {
      const clients = await base44.entities.Client.list().catch(() => []);
      const client = clients[0];
      if (!client) return;
      setDemoData((d) => ({
        ...(d || {}),
        client,
        clientUser: { id: "", email: client.email || "", full_name: client.full_name },
      }));
      setPreview("client");
    }
  };

  useEffect(() => {
    if (view?.type === 'admin' && new URLSearchParams(window.location.search).get('preview') === 'worker') handlePreview('worker');
  }, [view]);

  if (!view)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );

  if (view.type !== "admin")
    return <><RoleSettingsLink />{view.type === "client" ? (
      <ClientPortal user={view.user} client={view.client} />
    ) : (
      <WorkerPortal user={view.user} />
    )}</>;

  // Admin: render the admin view, or the selected portal preview
  return (
    <>
      {preview === "worker" && demoData?.worker ? (
        <WorkerPortal user={demoData.worker} />
      ) : preview === "client" && demoData?.client ? (
        <ClientPortal user={demoData.clientUser} client={demoData.client} />
      ) : (
        <AdminShell user={view.user} />
      )}
      <PreviewSwitcher
        value={preview || "admin"}
        onChange={(m) => handlePreview(m).catch(() => {})}
      />
    </>
  );
}