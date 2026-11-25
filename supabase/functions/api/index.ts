// The app's server functions, served from one Supabase Edge Function.
// The web app calls /functions/v1/api/<name>; see src/api/client.js.
import { serve } from '../_shared/server.ts';
import callInSick from './handlers/callInSick.ts';
import cancelClientShift from './handlers/cancelClientShift.ts';
import careNoteAssistant from './handlers/careNoteAssistant.ts';
import careNotes from './handlers/careNotes.ts';
import complaints from './handlers/complaints.ts';
import deleteOwnAccount from './handlers/deleteOwnAccount.ts';
import findReplacement from './handlers/findReplacement.ts';
import getClientTeam from './handlers/getClientTeam.ts';
import moveRosterShift from './handlers/moveRosterShift.ts';
import rosterAcknowledgements from './handlers/rosterAcknowledgements.ts';
import rosterInsights from './handlers/rosterInsights.ts';
import rosterRecommendations from './handlers/rosterRecommendations.ts';
import saveRosterShifts from './handlers/saveRosterShifts.ts';
import staffAccess from './handlers/staffAccess.ts';
import workerLeave from './handlers/workerLeave.ts';
import workerTimesheet from './handlers/workerTimesheet.ts';

const handlers: Record<string, (req: Request) => Promise<Response>> = {
  callInSick,
  cancelClientShift,
  careNoteAssistant,
  careNotes,
  complaints,
  deleteOwnAccount,
  findReplacement,
  getClientTeam,
  moveRosterShift,
  rosterAcknowledgements,
  rosterInsights,
  rosterRecommendations,
  saveRosterShifts,
  staffAccess,
  workerLeave,
  workerTimesheet,
};

serve(async (req: Request) => {
  const name = new URL(req.url).pathname.split('/').filter(Boolean).pop() || '';
  const handler = Object.hasOwn(handlers, name) ? handlers[name] : null;
  if (!handler) return Response.json({ error: 'Not found' }, { status: 404 });
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  return handler(req);
});
