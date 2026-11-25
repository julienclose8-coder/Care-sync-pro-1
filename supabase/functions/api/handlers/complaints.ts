import { createAppClient } from '../../_shared/server.ts';

async function handler(req: Request) {
  try {
    const app = createAppClient(req);
    const user = await app.auth.me();
    if (!user) return Response.json({ error: 'Please sign in.' }, { status: 401 });
    let canManage = user.role === 'admin';
    if (!canManage) {
      const assignments = await app.asServiceRole.entities.StaffAccessAssignment.filter({ subject_type: 'user', subject_id: user.id }, '-updated_date', 2);
      // Preserve legacy HR access without treating newly numbered planning roles as legacy HR/CEO.
      canManage = assignments.some(a => a.policy_version !== 2 && ['5', '11'].includes(a.level));
    }
    const body = await req.json();
    const { action = 'list' } = body;
    if (action === 'access') return Response.json({ can_manage: canManage });
    if (!['list', 'create', 'update'].includes(action)) return Response.json({ error: 'Invalid action.' }, { status: 400 });
    // HR assignments are authoritative server-side. The entity itself is admin-only;
    // every elevated operation below is scoped to the verified manager or reporter.
    const records = app.asServiceRole.entities.Complaint;
    const ownView = !canManage || body.scope === 'mine';
    const publicRecord = c => {
      if (!ownView) return c;
      const { internal_notes, activity, reviewed_by, assigned_handler, ...visible } = c;
      return visible;
    };
    const types = ['internal', 'external'];
    const categories = ['service', 'staff_conduct', 'safety', 'billing', 'privacy', 'other'];
    const priorities = ['low', 'normal', 'high', 'urgent'];
    const statuses = ['received', 'acknowledged', 'investigating', 'resolved', 'closed'];
    const text = (value, max, required = false) => {
      if (value == null && !required) return '';
      if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error('Please complete required fields within the displayed limits.');
      return value.trim();
    };
    const date = value => {
      const v = text(value, 10);
      if (v && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v)) || new Date(v).toISOString().slice(0, 10) !== v)) throw new Error('Enter a valid date.');
      return v;
    };
    const choice = (value, options) => { if (!options.includes(value)) throw new Error('Select a valid option.'); return value; };
    if (action === 'list') {
      const offset = body.offset ?? 0;
      if (!Number.isInteger(offset) || offset < 0 || offset > 100000) return Response.json({ error: 'Invalid page.' }, { status: 400 });
      const filter = ownView ? { reporter_id: user.id } : {};
      for (const [field, options] of [['complaint_type', types], ['status', statuses], ['priority', priorities]]) {
        if (body[field]) filter[field] = choice(body[field], options);
      }
      const page = await records.filter(filter, '-created_date', 26, offset);
      return Response.json({ can_manage: canManage, records: page.slice(0, 25).map(publicRecord), has_more: page.length > 25 });
    }
    const now = new Date().toISOString();
    const name = user.full_name || user.email || 'App user';
    if (action === 'create') {
      const relationship = choice(body.relationship || 'worker', ['worker', 'client', 'caregiver', 'other']);
      const payload = {
        reference: `CMP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        title: text(body.title, 160, true), description: text(body.description, 10000, true),
        complaint_type: canManage ? choice(body.complaint_type, types) : relationship === 'worker' ? 'internal' : 'external',
        category: choice(body.category || 'other', categories), priority: choice(body.priority || 'normal', priorities),
        desired_outcome: text(body.desired_outcome, 3000), incident_date: date(body.incident_date),
        reporter_id: user.id, reporter_name: name, relationship,
        complainant_name: text(body.complainant_name || name, 160, true),
        contact_details: text(body.contact_details ?? user.email ?? '', 300),
        received_via: canManage ? choice(body.received_via || 'app', ['app', 'phone', 'email', 'in_person', 'other']) : 'app',
        received_date: now.slice(0, 10), status: 'received',
        activity: [{ at: now, by: name, text: 'Complaint received.' }]
      };
      const saved = await records.create(payload);
      return Response.json({ record: publicRecord(saved) });
    }
    if (!canManage) return Response.json({ error: 'Only HR, admins, and the CEO can manage complaints.' }, { status: 403 });
    const id = text(body.id, 100, true);
    const existing = await records.get(id);
    if (!existing) return Response.json({ error: 'Complaint not found.' }, { status: 404 });
    const status = choice(body.status, statuses);
    const resolution = text(body.resolution, 5000);
    if (['resolved', 'closed'].includes(status) && !resolution) return Response.json({ error: 'Record a resolution before resolving or closing this complaint.' }, { status: 400 });
    if ((existing.activity || []).length >= 200) return Response.json({ error: 'This complaint has reached its activity limit.' }, { status: 400 });
    const payload = {
      status, priority: choice(body.priority, priorities),
      assigned_handler: text(body.assigned_handler, 160), follow_up_date: date(body.follow_up_date),
      internal_notes: text(body.internal_notes, 10000), resolution, reviewed_by: name,
      resolved_at: ['resolved', 'closed'].includes(status) ? existing.resolved_at || now : '',
      activity: [...(existing.activity || []), { at: now, by: name, text: `Review saved: ${status}.` }]
    };
    const saved = await records.update(id, payload);
    return Response.json({ record: saved });
  } catch (error) {
    return Response.json({ error: error.message || 'Unable to load complaints.' }, { status: 400 });
  }
}

export default handler;
