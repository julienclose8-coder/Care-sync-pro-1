import { createAppClient } from '../../_shared/server.ts';

async function handler(req: Request) {
  try {
    const app = createAppClient(req);
    if (!(await app.auth.isAuthenticated())) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await app.auth.me();
    const { client_id } = await req.json();
    if (typeof client_id !== 'string' || !client_id || client_id.length > 100) return Response.json({ error: 'Valid client required' }, { status: 400 });
    const client = await app.entities.Client.get(client_id);
    if (user.role !== 'admin' && (!client.email || client.email.toLowerCase() !== user.email?.toLowerCase())) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const team = await app.entities.SupportTeamMember.filter({ client_id, status: 'approved' });
    const ids = [...new Set(team.map(member => member.worker_id))];
    // User profiles require elevated access; expose only approved teammates' first names.
    const members = await Promise.all(ids.map(async id => {
      const worker = await app.asServiceRole.entities.User.get(id);
      const name = (worker.full_name || '').trim();
      return { first_name: name && !name.includes('@') ? name.split(/\s+/)[0] : 'Support worker' };
    }));
    members.sort((a, b) => a.first_name.localeCompare(b.first_name));
    return Response.json({ members });
  } catch (error) {
    return Response.json({ error: 'Unable to load support team' }, { status: 500 });
  }
}

export default handler;
