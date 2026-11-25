import { createAppClient } from '../../_shared/server.ts';

async function handler(req: Request) {
  try {
    const app = createAppClient(req);
    const user = await app.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const [clients, shifts, workers] = await Promise.all([
      app.entities.Client.list().catch(() => []),
      app.entities.Shift.list().catch(() => []),
      app.entities.User.list().catch(() => []),
    ]);

    const clientNames = Object.fromEntries(clients.map((c) => [c.id, c.full_name || 'Unknown']));
    const workerNames = Object.fromEntries(workers.map((w) => [w.id, w.full_name || w.email || '']));

    const roster = shifts.slice(0, 200).map((s) => ({
      client: clientNames[s.client_id] || 'Unknown',
      worker: s.worker_name || workerNames[s.worker_id] || 'Unassigned',
      date: s.date,
      start: s.start_time,
      end: s.end_time,
      service: s.service_type,
      status: s.status,
      clocked: !!(s.clock_in && s.clock_out),
    }));

    const needs = clients.slice(0, 80).map((c) => ({
      name: c.full_name,
      support_needs: c.support_needs,
      preferences: c.preferences,
      funding: c.funding_type,
      status: c.status,
    }));

    const prompt = `You are an experienced support coordinator for a disability and community support service in Australia.
Analyse the roster and client data below. Identify:
1. Recurring support patterns per client (usual days, times, service types) that the roster shows or should show.
2. Gaps or risks: clients with no upcoming shifts, workers overloaded on a day, missing patterns vs the client's stated support needs and preferences.
3. Practical rostering suggestions for the coming week, in plain language a coordinator can act on.

DATA:
${JSON.stringify({ shifts: roster, clients: needs })}

Return concise, specific insights. Reference clients and workers by name. Do not invent data that is not present.`;

    const res = await app.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          insights: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                detail: { type: 'string' },
              },
              required: ['title', 'detail'],
            },
          },
        },
        required: ['insights'],
      },
    });

    return Response.json({ insights: (res.insights || []).slice(0, 6) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export default handler;
