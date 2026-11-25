import React from 'react';
import { Badge } from '@/components/ui/badge';

export default function StaffLevelCatalog({ levels }) {
  return (
    <section aria-label="Access level definitions" className="space-y-3">
      <h2 className="font-heading font-semibold text-lg">Access level definitions</h2>
      <p className="text-sm text-muted-foreground">The twelve-role plan for scoped portals. Numbers identify roles, not automatic inheritance of lower levels.</p>
      <div className="grid gap-3 lg:grid-cols-2">
        {levels.map(level => (
          <article key={level.id} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">Level {level.id}</Badge><h3 className="font-semibold text-sm">{level.name}</h3></div>
            <p className="text-sm text-muted-foreground">{level.scope}</p>
            <p className="text-xs text-primary">{level.portal} portal · {level.mobile ? 'Phone, computer and web' : 'Computer and web'}</p>
          </article>
        ))}
      </div>
    </section>
  );
}