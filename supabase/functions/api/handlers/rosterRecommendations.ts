import { createAppClient } from '../../_shared/server.ts';
import { iso, interval, rosterLocked } from '../../_shared/rosterChanges.ts';
import { approvedLeave, workerOnLeave } from '../../_shared/workerLeave.ts';

const DAY_MS = 86400000;
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MIN_SHIFT_HOURS = 2;
const MAX_CLIENT_HOURS_PER_DAY = 6;
const NEAR_LIMIT_HOURS = 4;
const RANK = { available: 0, over_hours: 1, over_client_hours: 2, not_on_team: 3, untrained: 4, conflict: 5, over_limit: 6, not_possible: 7 };

function sydneyToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

async function handler(req: Request) {
  try {
    const app = createAppClient(req);
    const user = await app.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Please sign in.' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Only authorised management accounts can view recommendations.' }, { status: 403 });

    const { days } = await req.json().catch(() => ({}));
    const span = Math.max(1, Math.min(60, Number(days) || 14));
    const today = sydneyToday();
    const endIso = iso(Date.parse(`${today}T00:00:00Z`) + span * DAY_MS);

    const svc = app.asServiceRole.entities;
    const [usersRes, clientsRes, teamRes, shiftsRes] = await Promise.all([
      svc.User.list().catch(() => []),
      svc.Client.list().catch(() => []),
      svc.SupportTeamMember.filter({ status: 'approved' }, { limit: 500 }).catch(() => ({ items: [] })),
      svc.Shift.filter({ status: 'scheduled', date: { $gte: today, $lte: endIso } }, { limit: 500, sort: 'date' }).catch(() => ({ items: [] })),
    ]);
    const users = Array.isArray(usersRes) ? usersRes : (usersRes.items || []);
    const clients = Array.isArray(clientsRes) ? clientsRes : (clientsRes.items || []);
    const team = Array.isArray(teamRes) ? teamRes : (teamRes.items || []);
    const shifts = Array.isArray(shiftsRes) ? shiftsRes : (shiftsRes.items || []);

    const clientName = (id) => clients.find((c) => c.id === id)?.full_name || 'Unknown client';
    const clientById = new Map(clients.map((c) => [c.id, c]));
    const teamByClient = new Map();
    for (const m of team) {
      if (!teamByClient.has(m.client_id)) teamByClient.set(m.client_id, new Set());
      teamByClient.get(m.client_id).add(m.worker_id);
    }

    const workers = users.filter((u) => u.role !== 'admin');

    // ── 6-hour-per-client alerts: group scheduled shifts by (worker, client, date) ──
    const loadMap = new Map();
    const refMap = new Map();
    for (const s of shifts) {
      if (!s.worker_id) continue;
      const key = `${s.worker_id}|${s.client_id}|${s.date}`;
      loadMap.set(key, (loadMap.get(key) || 0) + interval(s).hours);
      if (!refMap.has(key)) refMap.set(key, { worker_id: s.worker_id, worker_name: s.worker_name || '', client_id: s.client_id, date: s.date, shift_ids: [] });
      refMap.get(key).shift_ids.push(s.id);
    }
    const alerts = [];
    const near = [];
    for (const [key, hours] of loadMap.entries()) {
      const ref = refMap.get(key);
      const rounded = Math.round(hours * 100) / 100;
      const entry = { ...ref, client_name: clientName(ref.client_id), hours: rounded, max: MAX_CLIENT_HOURS_PER_DAY };
      if (rounded >= MAX_CLIENT_HOURS_PER_DAY) alerts.push({ ...entry, severity: rounded > MAX_CLIENT_HOURS_PER_DAY ? 'over' : 'at' });
      else if (rounded >= NEAR_LIMIT_HOURS) near.push({ ...entry, severity: 'near' });
    }
    alerts.sort((a, b) => b.hours - a.hours || a.date.localeCompare(b.date));
    near.sort((a, b) => b.hours - a.hours || a.date.localeCompare(b.date));

    // ── weekly load per worker ──
    const weekOf = (dateStr) => {
      const d = new Date(`${dateStr}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
      return iso(d);
    };
    const weekHours = new Map();
    for (const s of shifts) {
      if (!s.worker_id) continue;
      const k = `${s.worker_id}|${weekOf(s.date)}`;
      weekHours.set(k, (weekHours.get(k) || 0) + interval(s).hours);
    }
    const workerWeekLoad = new Map();
    for (const [k, h] of weekHours.entries()) {
      const wid = k.split('|')[0];
      const limit = Number(workers.find((w) => w.id === wid)?.weekly_hour_limit ?? 38) || 38;
      const pct = limit > 0 ? Math.min(100, Math.round((h / limit) * 100)) : 0;
      const prev = workerWeekLoad.get(wid);
      if (!prev || h > prev.hours) workerWeekLoad.set(wid, { hours: Math.round(h * 100) / 100, limit, pct });
    }
    const avgLoad = workers.length ? Math.round(workers.reduce((sum, w) => sum + (workerWeekLoad.get(w.id)?.pct || 0), 0) / workers.length) : 0;

    // ── client concentration: one client > 40% of a worker's week (variety / burnout) ──
    // Flagged for workers with more than 3 clients OR more than 20 hours in the week.
    const workerNameFromShifts = new Map();
    for (const s of shifts) if (s.worker_id && s.worker_name) workerNameFromShifts.set(s.worker_id, s.worker_name);
    const clientWeekHours = new Map(); // `worker|week|client` -> hours
    for (const s of shifts) {
      if (!s.worker_id) continue;
      const k = `${s.worker_id}|${weekOf(s.date)}|${s.client_id}`;
      clientWeekHours.set(k, (clientWeekHours.get(k) || 0) + interval(s).hours);
    }
    const distinctWorkerIds = new Set(shifts.filter((s) => s.worker_id).map((s) => s.worker_id));
    const concentration = [];
    for (const wid of distinctWorkerIds) {
      let bestWeek = null, bestHours = 0;
      for (const [k, h] of weekHours.entries()) {
        if (k.split('|')[0] !== wid) continue;
        if (h > bestHours) { bestHours = h; bestWeek = k.split('|')[1]; }
      }
      if (!bestWeek) continue;
      const perClient = [];
      for (const [k, h] of clientWeekHours.entries()) {
        const [w, wk, cid] = k.split('|');
        if (w !== wid || wk !== bestWeek) continue;
        perClient.push({ client_id: cid, hours: Math.round(h * 100) / 100 });
      }
      const distinctClients = perClient.length;
      if (distinctClients <= 1) continue;
      const total = perClient.reduce((s, p) => s + p.hours, 0);
      if (!(distinctClients > 3 || total > 20)) continue;
      for (const p of perClient) {
        const pct = total > 0 ? Math.round((p.hours / total) * 100) : 0;
        if (pct > 40) {
          concentration.push({
            worker_id: wid,
            worker_name: workerNameFromShifts.get(wid) || 'Support worker',
            client_id: p.client_id,
            client_name: clientName(p.client_id),
            client_hours: p.hours,
            total_hours: Math.round(total * 100) / 100,
            pct,
            distinct_clients: distinctClients,
            week_start: bestWeek,
          });
        }
      }
    }
    concentration.sort((a, b) => b.pct - a.pct || b.client_hours - a.client_hours);

    // ── recommendations for shifts needing cover (unassigned OR needs_replacement) ──
    const needingCover = shifts.filter((s) => !s.worker_id || s.needs_replacement);
    const leave = await approvedLeave(svc, today, iso(Date.parse(`${endIso}T00:00:00Z`) + DAY_MS));
    const recommendations = [];
    for (const shift of needingCover.slice(0, 40)) {
      const client = clientById.get(shift.client_id);
      if (!client) continue;
      const times = interval(shift);
      if (times.hours < MIN_SHIFT_HOURS) continue;
      const requirements = client.training_requirements || [];
      const supportNeeds = client.support_needs || '';
      const disabilityInfo = client.disability_info || '';
      const highSupport = !!(supportNeeds.trim() || disabilityInfo.trim() || requirements.length);
      const locked = rosterLocked(shift.date);
      const inHome = shift.support_setting === 'in_home';
      const approvedIds = teamByClient.get(shift.client_id) || new Set();
      const weekday = DAY_KEYS[new Date(`${shift.date}T00:00:00Z`).getUTCDay()];
      const monday = new Date(`${shift.date}T00:00:00Z`);
      monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
      const weekStart = iso(monday);
      const weekEnd = iso(monday.getTime() + 6 * DAY_MS);
      const dayBefore = iso(times.start - DAY_MS);
      const dayAfter = iso(times.start + DAY_MS);

      const candidates = [];
      for (const w of workers) {
        if ((shift.worker_id && w.id === shift.worker_id) || workerOnLeave(leave, w.id, times)) continue;
        const trainings = w.trainings || [];
        const onTeam = approvedIds.has(w.id);
        const matchCount = requirements.filter((t) => trainings.includes(t)).length;
        const needMatch = requirements.length ? matchCount / requirements.length : 1;
        const trained = needMatch >= 1;
        const conflict = shifts.some((other) => {
          if (!other.worker_id || other.worker_id !== w.id) return false;
          if (other.date < dayBefore || other.date > dayAfter) return false;
          if (other.id === shift.id) return false;
          const o = interval(other);
          return times.start < o.end && times.end > o.start;
        });
        const totalWeek = (weekHours.get(`${w.id}|${weekStart}`) || 0) + times.hours;
        const limit = Number(w.weekly_hour_limit ?? 38);
        const overHours = totalWeek > limit;
        const blocked = overHours && w.hour_limit_action === 'block';
        const sameClientDayHours = shifts
          .filter((s) => s.worker_id === w.id && s.client_id === shift.client_id && s.date === shift.date && s.id !== shift.id)
          .reduce((sum, s) => sum + interval(s).hours, 0) + times.hours;
        const overClientHours = sameClientDayHours > MAX_CLIENT_HOURS_PER_DAY;
        const clientHoursCapped = overClientHours && !(inHome && locked);
        const clientHoursWeek = shifts
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
          weekly_hours: Math.round(totalWeek * 100) / 100,
          weekly_limit: limit,
          load_pct: limit > 0 ? Math.min(100, Math.round((totalWeek / limit) * 100)) : 0,
          need_match_pct: Math.round(needMatch * 100),
          same_client_hours: Math.round(sameClientDayHours * 100) / 100,
          client_hours_week: Math.round(clientHoursWeek * 100) / 100,
          possible,
        });
      }
      candidates.sort((a, b) =>
        (RANK[a.status] - RANK[b.status]) ||
        (b.need_match_pct - a.need_match_pct) ||
        (a.load_pct - b.load_pct) ||
        (a.client_hours_week - b.client_hours_week) ||
        (a.worker_name || '').localeCompare(b.worker_name || '')
      );
      recommendations.push({
        shift: {
          id: shift.id,
          date: shift.date,
          start_time: shift.start_time,
          end_time: shift.end_time,
          client_name: client.full_name,
          service_type: shift.service_type || 'Support',
          support_setting: shift.support_setting || '',
          needs_replacement: !!shift.needs_replacement,
          original_worker: shift.worker_name || '',
        },
        client_context: { requirements, high_support: highSupport, locked, in_home: inHome },
        candidates: candidates.filter((c) => c.possible).slice(0, 3),
        total_candidates: candidates.length,
        available_count: candidates.filter((c) => c.status === 'available').length,
      });
    }
    recommendations.sort((a, b) => a.shift.date.localeCompare(b.shift.date) || a.shift.start_time.localeCompare(b.shift.start_time));

    return Response.json({
      window: { from: today, to: endIso, days: span },
      summary: {
        shifts_needing_cover: needingCover.length,
        alerts: alerts.length,
        near_limit: near.length,
        available_workers: workers.length,
        avg_load_pct: avgLoad,
        concentration: concentration.length,
      },
      alerts: alerts.slice(0, 50),
      near: near.slice(0, 50),
      concentration: concentration.slice(0, 50),
      recommendations,
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Unable to load recommendations.' }, { status: 500 });
  }
}

export default handler;
