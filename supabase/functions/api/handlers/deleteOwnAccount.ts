import { createAppClient } from '../../_shared/server.ts';

async function handler(req: Request) {
  try {
    const app = createAppClient(req);
    const user = await app.auth.me();
    if (!user || !(await app.auth.isAuthenticated())) return Response.json({ error: 'Sign in to delete your account.' }, { status: 401 });
    const body = await req.json();
    if (body.confirmation !== 'DELETE') return Response.json({ error: 'Type DELETE to confirm permanent account deletion.' }, { status: 400 });
    if (body.user_id || body.id) return Response.json({ error: 'You can only delete your own signed-in account.' }, { status: 400 });
    // Removes the sign-in account; its profile goes with it. Care records stay, as the law requires.
    await app.asServiceRole.auth.deleteUser(user.id);
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: error.message || 'Unable to delete your account.' }, { status: error.status || 500 });
  }
}

export default handler;
