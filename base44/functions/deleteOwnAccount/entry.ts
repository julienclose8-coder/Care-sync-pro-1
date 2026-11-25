import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !(await base44.auth.isAuthenticated())) return Response.json({ error: 'Sign in to delete your account.' }, { status: 401 });
    const body = await req.json();
    if (body.confirmation !== 'DELETE') return Response.json({ error: 'Type DELETE to confirm permanent account deletion.' }, { status: 400 });
    if (body.user_id || body.id) return Response.json({ error: 'You can only delete your own signed-in account.' }, { status: 400 });
    await base44.asServiceRole.entities.User.delete(user.id);
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: error.message || 'Unable to delete your account.' }, { status: error.status || 500 });
  }
}