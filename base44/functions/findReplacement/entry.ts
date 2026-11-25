import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { iso, interval, rosterLocked } from '../../shared/rosterChanges.ts';
import { approvedLeave, workerOnLeave } from '../../shared/workerLeave.ts';

const DAY_MS = 86400000;
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MIN_SHIFT_HOURS = 2;
const MAX_CLIENT_HOURS_PER_DAY = 6;
const RANK = { available: 0, over_hours: 1, over_client_hours: 2, not_on_team: 3, untrained: 4, conflict: 5, over_limit: 6, not_possible: 7 };

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Please sign in.' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Only authorised management accounts can find cover.' }, { status: 403 });

    const { shift_id } = await req.json().catch(() => ({}));
    if (typeof shift_id !== 'string' || !shift_id || shift_id.length > 100) return Response.json({ error: 'Choose a valid shift.' }, { status: 400 });

    const svc = base44.asServiceRole.entities;
    const shift = await svc.Shift.get(shift_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!shift) return Response.json({ error: 'This shift no longer exists.' }, { status: 404 });
    if (shift.status !== 'scheduled') return Response.json({ error: 'This shift can no longer be filled.' }, { status: 409 });

    // Rule 1: a recommendation requires both a client and a worker on the shift.
    if (!shift.client_id) return Response.json({ error: 'The shift must have a client before a worker can be recommended.' }, { status: 400 });
    if (!shift.worker_id) return Response.json({ error: 'The shift must have a worker assigned before a replacement can be recommended.' }, { status: 400 });

    const client = await svc.Client.get(shift.client_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!client) return Response.json({ error: 'Client not found.' }, { status: 404 });

    const times = interval(shift);
    // Rule 3: a worker shift cannot be less than 2 hours of support.
    if (times.hours < MIN_SHIFT_HOURS) return Response.json({ error: `A shift must be at least ${MIN_SHIFT_HOURS} hours of support before a worker can be recommended.` }, { status: 400 });

    const requirements = client.training_requirements || [];
    const preferences = client.preferences || '';
    const supportNeeds = client.support_needs || '';
    const disabilityInfo = client.disability_info || '';
    // Rule 10: a higher support level is inferred from documented support needs, disability context or required training.
    const highSupport = !!(supportNeeds.trim() || disabilityInfo.trim() || requirements.length);
    const locked = rosterLocked(shift.date);
    const inHome = shift.support_setting === 'in_home';

    // Monday of the shift's week (UTC), then a window covering ±1 day for conflicts and Mon-Sun for weekly hours.
    const monday = new Date(`${shift.date}T00:00:00Z`);
    monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
    const from = iso(monday.getTime() - DAY_MS);
    const to = iso(monday.getTime() + 7 * DAY_MS);

    const [usersRes, teamRes, shiftsRes] = await Promise.all([
      svc.User.list().catch(() => []),
      svc.SupportTeamMember.filter({ client_id: shift.client_id, status: 'approved' }, { limit: 500 }).catch(() => ({ items: [] })),
      svc.Shift.filter({ id: { $ne: shift.id }, status: { $ne: 'cancelled' }, date: { $gte: from, $lte: to } }, { limit: 500 }).catch(() => ({ items: [] })),
    ]);
    const users = Array.isArray(usersRes) ? usersRes : (usersRes.items || []);
    const team = Array.isArray(teamRes) ? teamRes : (teamRes.items || []);
    const weekShifts = Array.isArray(shiftsRes) ? shiftsRes : (shiftsRes.items || []);

    const approvedIds = new Set(team.map((m) => m.worker_id));
    const weekday = DAY_KEYS[new Date(`${shift.date}T00:00:00Z`).getUTCDay()];
    const weekStart = iso(monday);
    const weekEnd = iso(monday.getTime() + 6 * DAY_MS);

    const leave = await approvedLeave(svc, iso(times.start), iso(times.end));
    const candidates = [];
    for (const w of users) {
      if (w.role === 'admin' || w.id === shift.worker_id || workerOnLeave(leave, w.id, times)) continue;
      const trainings = w.trainings || [];
      // Rule 2: the worker must be on the client's approved team.
      const onTeam = approvedIds.has(w.id);
      // Rule 5/6: support-need (training) match is the category factor used for rostering bias.
      const matchCount = requirements.filter((t) => trainings.includes(t)).length;
      const needMatch = requirements.length ? matchCount / requirements.length : 1;
      const trained = needMatch >= 1;
      const conflict = weekShifts.some((other) => {
        if (other.worker_id !== w.id) return false;
        if (other.date < iso(times.start - DAY_MS) || other.date > iso(times.start + DAY_MS)) return false;
        const o = interval(other);
        return times.start < o.end && times.end > o.start;
      });
      const weekHours = weekShifts
        .filter((s) => s.worker_id === w.id && s.date >= weekStart && s.date <= weekEnd)
        .reduce((sum, s) => sum + interval(s).hours, 0) + times.hours;
      const limit = Number(w.weekly_hour_limit ?? 38);
      const overHours = weekHours > limit;
      const blocked = overHours && w.hour_limit_action === 'block';

      // Rule 7/9: no more than 6 hours with one client (or group) on a day; in-home is capped unless a support lock is in place.
      const sameClientDayHours = weekShifts
        .filter((s) => s.worker_id === w.id && s.client_id === shift.client_id && s.date === shift.date)
        .reduce((sum, s) => sum + interval(s).hours, 0) + times.hours;
      const overClientHours = sameClientDayHours > MAX_CLIENT_HOURS_PER_DAY;
      const clientHoursCapped = overClientHours && !(inHome && locked);

      // Rule 8: variety reduces burnout — track how much of the worker's week is already with this client.
      const clientHoursWeek = weekShifts
        .filter((s) => s.worker_id === w.id && s.client_id === shift.client_id && s.date >= weekStart && s.date <= weekEnd)
        .reduce((sum, s) => sum + interval(s).hours, 0);

      const avail = (w.availability || []).find((a) => a.day === weekday && a.start <= shift.start_time && a.end >= shift.end_time);

      let status;
      if (!onTeam) status = 'not_on_team';
      else if (!trained) status = 'untrained';
      else if (conflict) status = 'conflict';
      else if (blocked) status = 'over_limit';
      else if (clientHoursCapped) status = 'over_client_hours';
      else if (overHours) status = 'over_hours';
      else status = 'available';

      // Rule 10: for a higher-support client, an alternative is only possible when the worker is on the team, trained and free to take it.
      let possible = status === 'available' || status === 'over_hours';
      if (highSupport) possible = onTeam && trained && !conflict && !blocked && !clientHoursCapped;
      if (highSupport && !possible) status = 'not_possible';

      candidates.push({
        worker_id: w.id,
        worker_name: w.full_name || w.email || 'Support worker',
        status,
        on_team: onTeam,
        trained,
        has_conflict: conflict,
        available_today: !!avail,
        availability_set: (w.availability || []).length > 0,
        weekly_hours: Math.round(weekHours * 100) / 100,
        weekly_limit: limit,
        load_pct: limit > 0 ? Math.min(100, Math.round((weekHours / limit) * 100)) : 0,
        need_match_pct: Math.round(needMatch * 100),
        same_client_hours: Math.round(sameClientDayHours * 100) / 100,
        client_hours_week: Math.round(clientHoursWeek * 100) / 100,
        high_support: highSupport,
        possible,
      });
    }

    // Rule 6: rostering bias only by category (support-need match) and hour demands — no other factors.
    candidates.sort((a, b) =>
      (RANK[a.status] - RANK[b.status]) ||
      (b.need_match_pct - a.need_match_pct) ||
      (a.load_pct - b.load_pct) ||
      (a.client_hours_week - b.client_hours_week) ||
      (a.worker_name || '').localeCompare(b.worker_name || '')
    );

    return Response.json({
      shift: {
        id: shift.id,
        date: shift.date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        service_type: shift.service_type || 'Support',
        support_setting: shift.support_setting || '',
        client_name: client.full_name,
        sick_worker_name: shift.worker_name || '',
        replacement_reason: shift.replacement_reason || '',
      },
      client_context: {
        requirements,
        preferences,
        support_needs: supportNeeds,
        high_support: highSupport,
        locked,
        in_home: inHome,
      },
      rules: {
        min_shift_hours: MIN_SHIFT_HOURS,
        max_client_hours_per_day: MAX_CLIENT_HOURS_PER_DAY,
        in_home_lock_exception: inHome && locked,
      },
      candidates: candidates.slice(0, 60),
      counts: {
        available: candidates.filter((c) => c.status === 'available').length,
        over_hours: candidates.filter((c) => c.status === 'over_hours').length,
        over_client_hours: candidates.filter((c) => c.status === 'over_client_hours').length,
        near_miss: candidates.filter((c) => ['not_on_team', 'untrained', 'conflict', 'over_limit', 'not_possible'].includes(c.status)).length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Unable to find cover.' }, { status: 500 });
  }
}