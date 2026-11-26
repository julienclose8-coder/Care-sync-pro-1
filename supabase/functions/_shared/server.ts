// Shared setup for every server function (Supabase Edge Functions, Deno).
//
// createAppClient(req) gives a function three things:
//   app.auth          the signed-in caller (me, isAuthenticated)
//   app.entities      table access AS the caller, so the database access rules apply
//   app.asServiceRole table access that bypasses the access rules, plus email and AI
//                     helpers. Use it only after the function has checked permissions.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@1';
import { ApiError, createEntities } from './entities.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

let serviceClient: SupabaseClient | null = null;
const service = () => (serviceClient ??= createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }));

export type AppUser = { id: string; email: string; full_name: string; role: string; is_owner?: boolean; [key: string]: unknown };

export function createAppClient(req: Request) {
  const authorization = req.headers.get('Authorization') || '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: authorization ? { Authorization: authorization } : {} },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let mePromise: Promise<AppUser | null> | null = null;
  const loadMe = () => (mePromise ??= (async () => {
    if (!token) return null;
    const { data, error } = await service().auth.getUser(token);
    if (error || !data?.user) return null;
    const { data: profile } = await service().from('profiles').select('*').eq('id', data.user.id).maybeSingle();
    return { full_name: '', role: 'user', ...(profile || {}), id: data.user.id, email: data.user.email || '' } as AppUser;
  })());

  return {
    auth: {
      isAuthenticated: async () => !!(await loadMe()),
      // Throws 401 when nobody is signed in, like the old platform did.
      me: async () => {
        const me = await loadMe();
        if (!me) throw new ApiError('Unauthorized', 401);
        return me;
      },
    },
    entities: createEntities(userClient),
    asServiceRole: {
      entities: createEntities(service()),
      auth: {
        deleteUser: async (id: string) => {
          const { error } = await service().auth.admin.deleteUser(id);
          if (error) throw new ApiError(error.message, 500);
        },
      },
      integrations: { Core: { InvokeLLM: invokeLLM, SendEmail: sendEmail } },
    },
  };
}

// ---------------------------------------------------------------- AI (Anthropic Claude)
// Used by the care note assistant and roster suggestions. Needs the ANTHROPIC_API_KEY
// secret. Returns parsed JSON matching response_json_schema, or plain text without one.
type LLMRequest = { prompt: string; response_json_schema?: Record<string, unknown>; effort?: 'low' | 'medium' | 'high' };

let anthropic: Anthropic | null = null;

// Structured outputs need additionalProperties: false on every object and do not
// accept length or number limits, so tidy the app's schemas before sending them.
const UNSUPPORTED = ['minLength', 'maxLength', 'minimum', 'maximum', 'multipleOf', 'minItems', 'maxItems', 'pattern', 'default'];
function strictSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(strictSchema);
  if (!node || typeof node !== 'object') return node;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (UNSUPPORTED.includes(k)) continue;
    out[k] = k === 'properties' ? Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([pk, pv]) => [pk, strictSchema(pv)])) : strictSchema(v);
  }
  if (out.type === 'object') out.additionalProperties = false;
  return out;
}

export async function invokeLLM({ prompt, response_json_schema, effort = 'low' }: LLMRequest) {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new ApiError('The AI assistant is not set up yet. Ask an admin to add the AI key.', 503);
  anthropic ??= new Anthropic({ apiKey });
  try {
    const response = await anthropic.beta.messages.create({
      model: Deno.env.get('ANTHROPIC_MODEL') || 'claude-opus-5-5',
      max_tokens: 16000,
      // If the main model declines, the API retries on a fallback model in the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort,
        ...(response_json_schema ? { format: { type: 'json_schema', schema: strictSchema(response_json_schema) } } : {}),
      },
      messages: [{ role: 'user', content: prompt }],
    } as Anthropic.Beta.MessageCreateParamsNonStreaming);
    if (response.stop_reason === 'refusal') throw new ApiError('The AI assistant could not help with this request.', 422);
    if (response.stop_reason === 'max_tokens') throw new ApiError('The AI answer was too long. Please try again.', 502);
    const text = response.content.filter(block => block.type === 'text').map(block => (block as { text: string }).text).join('');
    return response_json_schema ? JSON.parse(text) : text;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Anthropic.RateLimitError) throw new ApiError('The AI assistant is busy. Please try again in a minute.', 429);
    if (error instanceof Anthropic.AuthenticationError) throw new ApiError('The AI key is not valid. Ask an admin to check it.', 503);
    if (error instanceof Anthropic.APIError) throw new ApiError('The AI assistant is unavailable right now.', 502);
    if (error instanceof SyntaxError) throw new ApiError('The AI assistant returned an unexpected answer.', 502);
    throw error;
  }
}

// ---------------------------------------------------------------- Email (Resend)
// Transactional emails, such as telling admins a worker called in sick. Needs the
// RESEND_API_KEY and EMAIL_FROM secrets. Without them, emails are skipped (logged).
type EmailRequest = { to: string; subject: string; text?: string; body?: string; html?: string; category?: string };

export async function sendEmail({ to, subject, text, body, html }: EmailRequest) {
  const key = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM');
  if (!key || !from) {
    console.warn('Email not sent: RESEND_API_KEY or EMAIL_FROM is not set.');
    return { sent: false };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text: text ?? body, ...(html ? { html } : {}) }),
  });
  if (!res.ok) throw new ApiError('Unable to send email', 502);
  return { sent: true };
}

// ---------------------------------------------------------------- HTTP wrapper
// Adds CORS for the web app and turns thrown errors into JSON error responses.
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || 'https://caresyncpro1.com,https://www.caresyncpro1.com,https://care-sync-pro-1.netlify.app,http://localhost:5173')
  .split(',').map(origin => origin.trim()).filter(Boolean);

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function serve(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req: Request) => {
    const cors = corsHeaders(req);
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    let res: Response;
    try {
      res = await handler(req);
    } catch (error) {
      const status = (error as { status?: number })?.status || 500;
      res = Response.json({ error: status >= 500 ? 'Something went wrong. Please try again.' : (error as Error).message }, { status });
    }
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
    return new Response(res.body, { status: res.status, headers });
  });
}
