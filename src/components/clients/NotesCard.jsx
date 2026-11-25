import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import CareNotesWorkspace from '@/components/notes/CareNotesWorkspace';

export default function NotesCard({ clientId }) {
  return <Card className="min-w-0"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="w-4 h-4 text-primary" /> Client notes</CardTitle></CardHeader><CardContent><CareNotesWorkspace clientId={clientId} /></CardContent></Card>;
}