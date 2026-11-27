// Adding organisations (companies) to CareSync Pro. Platform admins only.
//   list:   every organisation with its number of accounts
//   create: { name, admin_email, abn? } adds an organisation and invites its first
//           admin (as owner). They join it when they sign up, or straight away if
//           they already have an account that is not in any organisation.
import { createAppClient, platformEntities } from '../../_shared/server.ts';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handler(req: Request) {
  try {
    const app = createAppClient(req);
    const user = await app.auth.me();
    if (!user.is_platform_admin) return Response.json({ error: 'Only the CareSync Pro platform admin can manage organisations.' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const db = platformEntities();

    if (body.action === 'list') {
      const organisations = await db.Organisation.list('name', 500);
      const people = await db.User.filter({ organisation_id: { $exists: true } }, null, 5000, 0);
      const invites = await db.OrganisationInvitation.filter({ accepted_at: null }, '-created_date', 1000, 0);
      return Response.json({
        organisations: organisations.map((org: Record<string, unknown>) => ({
          ...org,
          accounts: people.filter((p: Record<string, unknown>) => p.organisation_id === org.id).length,
          pending_invites: invites.filter((i: Record<string, unknown>) => i.organisation_id === org.id).map((i: Record<string, unknown>) => ({ id: i.id, email: i.email, role: i.role })),
        })),
      });
    }

    if (body.action === 'create') {
      const name = String(body.name || '').trim();
      const email = String(body.admin_email || '').trim().toLowerCase();
      if (!name || name.length > 200) return Response.json({ error: 'Enter the organisation name.' }, { status: 400 });
      if (!EMAIL.test(email)) return Response.json({ error: "Enter the first admin's email address." }, { status: 400 });
      const existing = await db.User.filter({ email }, null, 1, 0);
      if (existing[0]?.organisation_id) return Response.json({ error: 'That email already belongs to an organisation. Use a different email for this admin.' }, { status: 409 });
      if (await db.OrganisationInvitation.count({ email, accepted_at: null })) return Response.json({ error: 'That email already has an open invitation.' }, { status: 409 });
      const organisation = await db.Organisation.create({ name, abn: body.abn ? String(body.abn).trim().slice(0, 20) : null });
      // Adding the invitation also links an existing account with no organisation (database trigger).
      const invitation = await db.OrganisationInvitation.create({ organisation_id: organisation.id, email, role: 'admin', is_owner: true });
      return Response.json({ organisation, invitation });
    }

    return Response.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: (error as Error).message || 'Unable to manage organisations.' }, { status: (error as { status?: number }).status || 500 });
  }
}

export default handler;
