import React from 'react';
import { Loader2 } from 'lucide-react';

export default function PageLoading() {
  return <div role="status" aria-label="Loading page" className="flex min-h-[50dvh] items-center justify-center"><Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-primary" /><span className="sr-only">Loading page…</span></div>;
}