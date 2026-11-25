import { createAppClient } from '../../_shared/server.ts';
import { ROLE_VERSION, roles, normalizedLevel, activationMap, responsibilityRouting, roleContext } from '../../_shared/staffRoles.ts';

async function handler(req: Request) {
  try {
    const app = createAppClient(req);
    const user = await app.auth.me();
    if (!user) return Response.json({ error: 'Please sign in.' }, { status: 401 });
    const body = await req.json();
    const { action = 'list', subject_type = 'user', offset = 0 } = body;
    if (!['context', 'list', 'save', 'clear', 'activation', 'pay_visibility'].includes(action)) return Response.json({ error: 'Invalid action.' }, { status: 400 });
    // Trusted, server-managed role records authorize only this role-settings flow.
    // Care and financial portals keep their current restrictions until their separate rollout.
    const context = await roleContext(app, user);
    if (action === 'context') return Response.json(context);
    const entities = app.asServiceRole.entities;
    if (action === 'activation') {
      if (!context.can_activate) return Response.json({ error: 'Only CEO and Operation assessment can activate roles.' }, { status: 403 });
      const role = roles.find(role => role.id === body.level && !role.fixed);
      if (!role || typeof body.active !== 'boolean') return Response.json({ error: 'Choose an optional role and an activation setting.' }, { status: 400 });
      const saved = await entities.RoleActivation.upsert([{ level: role.id, active: body.active, updated_by: user.id, changed_at: new Date().toISOString() }], { key: 'level' });
      return Response.json({ level: role.id, active: body.active, record_id: saved.records[0]?.id });
    }
    if (action === 'list') {
      if (!['user', 'worker'].includes(subject_type) || !Number.isInteger(offset) || offset < 0 || offset > 100000) return Response.json({ error: 'Invalid staff page.' }, { status: 400 });
      const activation = await entities.RoleActivation.filter({}, { limit: 20 });
      const active = activationMap(activation.items);
      const metadata = { ...context, levels: roles.map(role => ({ ...role, active: active[role.id] })), routing: responsibilityRouting(active) };
      if (!context.can_manage) return Response.json({ ...metadata, rows: [], has_more: false });
      const subjects = subject_type === 'user' ? entities.User : entities.Worker;
      const people = await subjects.list('-created_date', 26, offset);
      const page = people.slice(0, 25);
      const saved = page.length ? (await entities.StaffAccessAssignment.filter({ subject_type, subject_id: { $in: page.map(person => person.id) } }, { sort: '-updated_date', limit: 50 })).items : [];
      const rows = page.map(person => {
        const isCeo = subject_type === 'user' && person.is_owner === true;
        const assignment = saved.find(record => record.subject_id === person.id);
        return { id: person.id, name: person.full_name || person.email || 'Unnamed staff member', email: person.email || '', current_access: subject_type === 'worker' ? 'Profile only (not a login)' : person.role === 'admin' ? 'Admin' : 'Existing worker/client portal', is_ceo: isCeo, level: isCeo ? '12' : normalizedLevel(assignment), assignment_id: assignment?.id || null, worker_pay_visible: assignment?.policy_version === ROLE_VERSION && assignment?.level === '11' && assignment?.worker_pay_visible === true, needs_confirmation: !!assignment && assignment.policy_version !== ROLE_VERSION };
      });
      return Response.json({ ...metadata, rows, has_more: people.length > 25 });
    }
    if (!context.can_manage) return Response.json({ error: 'Only the CEO can assign levels or decide individual worker-pay visibility.' }, { status: 403 });
    const { subject_id, level } = body;
    if (!['user', 'worker'].includes(subject_type) || typeof subject_id !== 'string' || !subject_id || subject_id.length > 100) return Response.json({ error: 'Select a staff member.' }, { status: 400 });
    if (subject_type === 'user' && await app.asServiceRole.entities.User.count({ id: subject_id, is_owner: true })) return Response.json({ error: 'The primary CEO designation is protected.' }, { status: 403 });
    if (subject_type === 'user' && subject_id === user.id && (action === 'clear' || (action === 'save' && level !== '12'))) return Response.json({ error: 'A CEO cannot remove their own role-settings authority.' }, { status: 403 });
    const subjects = subject_type === 'user' ? entities.User : entities.Worker;
    const person = await subjects.get(subject_id);
    if (!person) return Response.json({ error: 'Staff member not found.' }, { status: 404 });
    const assignments = entities.StaffAccessAssignment;
    const { items: existing } = await assignments.filter({ subject_id, subject_type }, { limit: 2 });
    if (existing.length > 1) return Response.json({ error: 'Duplicate assignments found. Resolve them before continuing.' }, { status: 409 });
    if (action === 'clear') {
      if (existing[0]) await assignments.delete(existing[0].id);
      return Response.json({ cleared: true });
    }
    if (action === 'pay_visibility') {
      if (typeof body.visible !== 'boolean' || existing[0]?.level !== '11' || existing[0]?.policy_version !== ROLE_VERSION) return Response.json({ error: 'Save an Operation assessment assignment before setting its pay exception.' }, { status: 400 });
      const saved = await assignments.update(existing[0].id, { worker_pay_visible: body.visible, pay_visibility_by: user.id, pay_visibility_at: new Date().toISOString() });
      return Response.json({ assignment_id: saved.id, worker_pay_visible: saved.worker_pay_visible });
    }
    if (!roles.some(role => role.id === level)) return Response.json({ error: 'Select a valid level.' }, { status: 400 });
    const payload = { subject_id, subject_type, level, policy_version: ROLE_VERSION, worker_pay_visible: level === '11' && existing[0]?.policy_version === ROLE_VERSION && existing[0]?.worker_pay_visible === true, assigned_by: user.id, assigned_at: new Date().toISOString() };
    const saved = existing[0] ? await assignments.update(existing[0].id, payload) : await assignments.create(payload);
    return Response.json({ assignment_id: saved.id, level: saved.level, worker_pay_visible: saved.worker_pay_visible, needs_confirmation: false });
  } catch (error) {
    return Response.json({ error: error.message || 'Unable to manage staff access.' }, { status: 500 });
  }
}

export default handler;
