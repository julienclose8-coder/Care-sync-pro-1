import React from 'react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';

// Shown to someone who has signed in but is not part of any care organisation yet.
export default function NoOrganisation({ email, onRetry }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 text-center shadow-sm">
        <h1 className="font-heading text-2xl font-bold">Almost there</h1>
        <p className="text-sm text-muted-foreground">
          Your account{email ? <> (<span className="font-medium text-foreground">{email}</span>)</> : null} is not linked to a care organisation yet.
        </p>
        <p className="text-sm text-muted-foreground">
          Ask your manager to add this email address in CareSync Pro as a worker, client or staff invitation. Then tap Check again.
        </p>
        <div className="flex justify-center gap-2">
          <Button onClick={onRetry}>Check again</Button>
          <Button variant="outline" onClick={() => api.auth.logout()}>Sign out</Button>
        </div>
      </div>
    </main>
  );
}
