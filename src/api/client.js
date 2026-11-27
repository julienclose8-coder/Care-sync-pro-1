// The app's single connection to its backend (Supabase: database, sign-in, files and
// server functions). Screens use `api.entities`, `api.auth`, `api.functions` and
// `api.files`; nothing else talks to the backend directly.
import { createClient } from '@supabase/supabase-js';
import { ApiError, createEntities } from '../../supabase/functions/_shared/entities.js';
import { publicOrigin } from '@/lib/native';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  // Fail loudly in development; a build without these cannot reach the backend.
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local.');
}

export const supabase = createClient(url || 'http://localhost:54321', key || 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});

export { ApiError };

const authError = (error, fallback) => new ApiError(error?.message || fallback, error?.status || 400);

async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw new ApiError('Authentication required', 401);
  return data.user;
}

const auth = {
  async isAuthenticated() {
    const { data } = await supabase.auth.getSession();
    return !!data?.session;
  },

  // The signed-in person's profile: id, email, full_name, role and their other fields.
  async me() {
    const user = await currentUser();
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) throw new ApiError(error.message, 500);
    return { full_name: '', role: 'user', ...(data || {}), id: user.id, email: user.email };
  },

  async updateMe(changes) {
    const user = await currentUser();
    const { data, error } = await supabase.from('profiles').update(changes).eq('id', user.id).select().single();
    if (error) throw new ApiError(error.message, 400);
    return data;
  },

  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw authError(error, 'Invalid email or password');
    return { access_token: data.session?.access_token, user: data.user };
  },

  loginWithProvider(provider, returnTo = '/') {
    return supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: new URL(returnTo, window.location.origin).href },
    });
  },

  // Sign-up sends a 6-digit code (and a link) to the email address.
  async register({ email, password, full_name }) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: full_name ? { full_name } : {}, emailRedirectTo: publicOrigin() },
    });
    if (error) throw authError(error, 'Registration failed');
  },

  async verifyOtp({ email, otpCode }) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'email' });
    if (error) throw authError(error, 'Invalid verification code');
    return { access_token: data.session?.access_token };
  },

  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw authError(error, 'Failed to resend code');
  },

  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${publicOrigin()}/reset-password`,
    });
    if (error) throw authError(error, 'Unable to send reset email');
  },

  // The reset email link signs the person in for recovery; this sets the new password.
  async resetPassword({ newPassword }) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw authError(error, 'Failed to reset password');
  },

  // Signs out and goes to the sign-in page (pass null to stay on the page).
  async logout(redirectTo = '/login') {
    await supabase.auth.signOut();
    if (redirectTo) window.location.href = redirectTo;
  },

  redirectToLogin(returnTo = window.location.href) {
    const target = new URL(returnTo, window.location.origin);
    const path = target.origin === window.location.origin ? target.pathname + target.search : '/';
    window.location.href = `/login${path && path !== '/' ? `?returnTo=${encodeURIComponent(path)}` : ''}`;
  },
};

const functions = {
  // Calls a server function. Resolves to { data }; failures throw an ApiError whose
  // response.data.error carries the function's message.
  async invoke(name, body = {}) {
    const { data, error } = await supabase.functions.invoke(`api/${name}`, { body });
    if (error) {
      let payload;
      try { payload = await error.context?.json(); } catch { payload = undefined; }
      const status = error.context?.status || 500;
      throw new ApiError(payload?.error || error.message || 'Request failed', status, payload);
    }
    return { data };
  },
};

const BUCKET = 'documents';
const STORED = 'storage:';

const files = {
  // Uploads into the private documents store. Returns { file_url }, a reference
  // that only signed-in people with access can open, through openUrl().
  async upload(file) {
    const user = await currentUser();
    const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(-120);
    const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined });
    if (error) throw new ApiError(error.message || 'Upload failed', 400);
    return { file_url: `${STORED}${BUCKET}/${path}` };
  },

  // A short-lived link (5 minutes) for a stored document.
  async openUrl(fileUrl) {
    if (!fileUrl?.startsWith(STORED)) return fileUrl;
    const [bucket, ...rest] = fileUrl.slice(STORED.length).split('/');
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(rest.join('/'), 300);
    if (error) throw new ApiError(error.message || 'Unable to open file', 403);
    return data.signedUrl;
  },
};

export const api = {
  entities: createEntities(supabase, { realtime: true }),
  auth,
  functions,
  files,
};
