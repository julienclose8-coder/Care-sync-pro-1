// Data access layer shared by the web app and the server functions.
//
// It gives each table a small, record-style interface (list, filter, get, create,
// update, delete, ...) on top of a Supabase client. The browser passes a client signed
// in as the current person, so the database's Row Level Security rules decide what they
// can see. Server functions can also pass a service-role client for privileged work.
//
// Filters use a small JSON query language:
//   { status: 'approved' }                      equals
//   { date: { $gte: '2026-01-01', $lte: ... } } ranges
//   { status: { $ne: 'cancelled' } }            not equal (also matches empty values)
//   { worker_id: { $in: [...] } }               one of
//   { $or: [ {...}, {...} ] }, { $and: [...] }  combinations
// Sort is a column name, with a leading "-" for newest/largest first.

export const TABLES = {
  CareNote: 'care_notes',
  Client: 'clients',
  Complaint: 'complaints',
  Goal: 'goals',
  HomeAssessment: 'home_assessments',
  Invoice: 'invoices',
  PolicyDocument: 'policy_documents',
  RoleActivation: 'role_activations',
  RosterAcknowledgement: 'roster_acknowledgements',
  Shift: 'shifts',
  ShiftHistory: 'shift_histories',
  StaffAccessAssignment: 'staff_access_assignments',
  SupportRequest: 'support_requests',
  SupportTeamMember: 'support_team_members',
  TimeCorrection: 'time_corrections',
  User: 'profiles',
  Worker: 'workers',
  WorkerLeaveRequest: 'worker_leave_requests',
  WorkerPayment: 'worker_payments',
};

const COLUMN = /^[a-z_][a-z0-9_]*$/;
const READ_ONLY = ['id', 'created_date', 'updated_date', 'created_by_id'];

export class ApiError extends Error {
  constructor(message, status = 500, data = undefined) {
    super(message);
    this.status = status;
    this.data = data ?? { error: message };
    // Shape used by the app's existing error handling: err.response?.data?.error
    this.response = { status, data: this.data };
  }
}

function fail(error, fallback = 'Request failed') {
  if (error instanceof ApiError) throw error;
  const code = error?.code;
  const status = code === 'PGRST116' ? 404 : code === '42501' ? 403 : code === '23505' ? 409 : code?.startsWith?.('23') || code?.startsWith?.('22') ? 400 : 500;
  throw new ApiError(error?.message || fallback, status);
}

function column(name) {
  if (!COLUMN.test(name)) throw new ApiError(`Invalid field name: ${name}`, 400);
  return name;
}

// Quote a value for a PostgREST logic expression.
function quote(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  return '"' + String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

const OPS = { $gt: 'gt', $gte: 'gte', $lt: 'lt', $lte: 'lte' };

// Profile ids are sign-in account ids (UUIDs). Records can point at either a profile
// or a roster-only worker, so a non-UUID id simply matches no profile.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_COLUMNS = { profiles: new Set(['id']) };

// List columns (text[]). For these, { col: v } means "contains v" and
// { col: { $in: [...] } } means "contains any of these", as before.
const ARRAY_COLUMNS = {
  profiles: ['trainings'], clients: ['training_requirements'], invoices: ['shift_ids', 'worker_ids'],
  shifts: ['goal_ids'], workers: ['trainings'], worker_leave_requests: ['worker_ids'],
};
const arrayLiteral = list => `{${list.map(quote).join(',')}}`;
const NOTHING = 'id.is.null';
const EVERYTHING = 'id.not.is.null';

function fieldTerms(field, condition, uuidCols, arrayCols) {
  const col = column(field);
  if (arrayCols?.has(col) && condition !== null && condition !== undefined) {
    if (typeof condition !== 'object') return [`${col}.cs.${arrayLiteral([condition])}`];
    if (Array.isArray(condition)) return [`${col}.cs.${arrayLiteral(condition)}`];
    if ('$in' in condition) {
      const list = Array.isArray(condition.$in) ? condition.$in : [];
      return [list.length ? `${col}.ov.${arrayLiteral(list)}` : NOTHING];
    }
  }
  if (uuidCols?.has(col)) {
    const ok = v => typeof v === 'string' && UUID.test(v);
    if (typeof condition === 'string' && !ok(condition)) return [NOTHING];
    if (condition && typeof condition === 'object' && !Array.isArray(condition)) {
      condition = { ...condition };
      if ('$in' in condition) condition.$in = (condition.$in || []).filter(ok);
      if ('$nin' in condition) condition.$nin = (condition.$nin || []).filter(ok);
      if ('$ne' in condition && condition.$ne != null && !ok(condition.$ne)) { delete condition.$ne; if (!Object.keys(condition).length) return [EVERYTHING]; }
      for (const op of Object.keys(OPS)) if (op in condition) delete condition[op];
      if (!Object.keys(condition).length) return [EVERYTHING];
    }
  }
  if (condition === null || condition === undefined) return [`${col}.is.null`];
  if (Array.isArray(condition)) return [`${col}.cs.${arrayLiteral(condition)}`];
  if (typeof condition !== 'object' || condition instanceof Date) {
    if (typeof condition === 'boolean') return [`${col}.is.${condition}`];
    return [`${col}.eq.${quote(condition instanceof Date ? condition.toISOString() : condition)}`];
  }
  const terms = [];
  for (const [op, value] of Object.entries(condition)) {
    if (OPS[op]) terms.push(`${col}.${OPS[op]}.${quote(value)}`);
    else if (op === '$ne') {
      terms.push(value === null || value === undefined ? `${col}.not.is.null` : `or(${col}.is.null,${col}.neq.${quote(value)})`);
    } else if (op === '$in') {
      const list = Array.isArray(value) ? value : [];
      terms.push(list.length ? `${col}.in.(${list.map(quote).join(',')})` : NOTHING);
    } else if (op === '$nin') {
      const list = Array.isArray(value) ? value : [];
      if (list.length) terms.push(`or(${col}.is.null,${col}.not.in.(${list.map(quote).join(',')}))`);
    } else if (op === '$exists') {
      terms.push(value ? `${col}.not.is.null` : `${col}.is.null`);
    } else throw new ApiError(`Unsupported filter: ${op}`, 400);
  }
  return terms;
}

// Turn a JSON query into PostgREST "and(...)" logic terms.
export function compileQuery(query = {}, uuidCols, arrayCols) {
  const terms = [];
  for (const [key, value] of Object.entries(query || {})) {
    if (key === '$and' || key === '$or') {
      const parts = (value || []).map(sub => compileQuery(sub, uuidCols, arrayCols)).filter(t => t.length).map(t => (t.length === 1 ? t[0] : `and(${t.join(',')})`));
      if (!parts.length) continue;
      terms.push(parts.length === 1 ? parts[0] : `${key === '$and' ? 'and' : 'or'}(${parts.join(',')})`);
    } else {
      terms.push(...fieldTerms(key, value, uuidCols, arrayCols));
    }
  }
  return terms;
}

function applyQuery(builder, query, table) {
  const terms = compileQuery(query, UUID_COLUMNS[table], new Set(ARRAY_COLUMNS[table] || []));
  // A single-item or() is the simplest way to hand PostgREST a nested logic tree.
  return terms.length ? builder.or(terms.length === 1 ? terms[0] : `and(${terms.join(',')})`) : builder;
}

function applySort(builder, sort) {
  if (!sort) return builder;
  const desc = sort.startsWith('-');
  const col = column(desc ? sort.slice(1) : sort);
  return builder.order(col, { ascending: !desc, nullsFirst: false }).order('id', { ascending: true });
}

function cleanRecord(data = {}) {
  const record = { ...data };
  for (const key of READ_ONLY) delete record[key];
  for (const key of Object.keys(record)) {
    column(key);
    if (record[key] === undefined) delete record[key];
  }
  return record;
}

const encodeCursor = offset => btoa(JSON.stringify({ o: offset }));
const decodeCursor = cursor => {
  try {
    const { o } = JSON.parse(atob(cursor));
    return Number.isInteger(o) && o >= 0 ? o : 0;
  } catch {
    throw new ApiError('Invalid page.', 400);
  }
};

// Fetch with a hard cap; PostgREST pages are 1000 rows by default.
async function fetchRows(client, table, { query, sort, limit, skip = 0, fields }) {
  const max = limit ?? 5000;
  const rows = [];
  let offset = skip;
  while (rows.length < max) {
    const size = Math.min(1000, max - rows.length);
    let builder = client.from(table).select(fields?.length ? ['id', ...fields.map(column)].join(',') : '*');
    builder = applySort(applyQuery(builder, query, table), sort || '-created_date');
    const { data, error } = await builder.range(offset, offset + size - 1);
    if (error) fail(error);
    rows.push(...data);
    if (data.length < size) break;
    offset += size;
  }
  return rows;
}

/** @returns {Record<string, any>} */
export function createEntity(client, name, { realtime } = {}) {
  const table = TABLES[name];
  if (!table) throw new ApiError(`Unknown record type: ${name}`, 400);

  // filter(query, sort?, limit?, skip?) returns an array.
  // filter(query, { sort, limit, cursor, fields }) returns { items, has_more, next_cursor }.
  /** @returns {Promise<any>} */
  async function filter(query = {}, sortOrOptions, limit, skip) {
    if (sortOrOptions && typeof sortOrOptions === 'object') {
      const { sort, limit: pageSize = 50, cursor, fields } = sortOrOptions;
      const offset = cursor ? decodeCursor(cursor) : 0;
      const rows = await fetchRows(client, table, { query, sort, limit: pageSize + 1, skip: offset, fields });
      const has_more = rows.length > pageSize;
      const items = rows.slice(0, pageSize);
      return { items, has_more, next_cursor: has_more ? encodeCursor(offset + pageSize) : null };
    }
    return fetchRows(client, table, { query, sort: sortOrOptions, limit, skip });
  }

  return {
    list: (sort, limit, skip) => filter({}, sort, limit, skip),
    filter,
    async get(id) {
      if (UUID_COLUMNS[table]?.has('id') && !(typeof id === 'string' && UUID.test(id))) throw new ApiError(`${name} not found`, 404);
      const { data, error } = await client.from(table).select('*').eq('id', id).maybeSingle();
      if (error) fail(error);
      if (!data) throw new ApiError(`${name} not found`, 404);
      return data;
    },
    async count(query = {}) {
      const { count, error } = await applyQuery(client.from(table).select('id', { count: 'exact', head: true }), query, table);
      if (error) fail(error);
      return count || 0;
    },
    async create(data) {
      const { data: row, error } = await client.from(table).insert(cleanRecord(data)).select().single();
      if (error) fail(error);
      return row;
    },
    async bulkCreate(records) {
      if (!records?.length) return [];
      const { data, error } = await client.from(table).insert(records.map(cleanRecord)).select();
      if (error) fail(error);
      return data;
    },
    async update(id, data) {
      const { data: row, error } = await client.from(table).update(cleanRecord(data)).eq('id', id).select().maybeSingle();
      if (error) fail(error);
      if (!row) throw new ApiError(`${name} not found`, 404);
      return row;
    },
    // updateMany(query, { $set: {...} }) updates every matching record.
    async updateMany(query, change) {
      const values = cleanRecord(change?.$set ?? change);
      if (!Object.keys(values).length) return { updated: 0 };
      const terms = compileQuery(query, UUID_COLUMNS[table], new Set(ARRAY_COLUMNS[table] || []));
      if (!terms.length) throw new ApiError('Refusing to update every record without a filter', 400);
      const { data, error } = await applyQuery(client.from(table).update(values), query, table).select('id');
      if (error) fail(error);
      return { updated: data.length };
    },
    // upsert(records, { key }) inserts or updates on a unique column.
    async upsert(records, { key = 'id' } = {}) {
      const list = Array.isArray(records) ? records : [records];
      const { data, error } = await client.from(table).upsert(list.map(r => ({ ...cleanRecord(r), ...(r.id && key === 'id' ? { id: r.id } : {}) })), { onConflict: column(key) }).select();
      if (error) fail(error);
      return data;
    },
    async delete(id) {
      const { error } = await client.from(table).delete().eq('id', id);
      if (error) fail(error);
      return { id };
    },
    async deleteMany(query) {
      if (!compileQuery(query, UUID_COLUMNS[table], new Set(ARRAY_COLUMNS[table] || [])).length) throw new ApiError('Refusing to delete every record without a filter', 400);
      const { data, error } = await applyQuery(client.from(table).delete(), query, table).select('id');
      if (error) fail(error);
      return { deleted: data.length };
    },
    // subscribe(callback) calls back on every change the person is allowed to see,
    // with { type: 'create' | 'update' | 'delete', id, data }. Returns an unsubscribe function.
    subscribe(callback) {
      if (!realtime) return () => {};
      const channel = client
        .channel(`${table}-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, payload => {
          const type = payload.eventType === 'INSERT' ? 'create' : payload.eventType === 'UPDATE' ? 'update' : 'delete';
          const data = type === 'delete' ? payload.old : payload.new;
          callback({ type, id: data?.id, data });
        })
        .subscribe();
      return () => { client.removeChannel(channel); };
    },
  };
}

/** @returns {Record<string, Record<string, any>>} */
export function createEntities(client, options) {
  return Object.fromEntries(Object.keys(TABLES).map(name => [name, createEntity(client, name, options)]));
}
