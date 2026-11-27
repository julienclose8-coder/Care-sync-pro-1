# CareSync Pro

Care agency app for NDIS and disability support: clients, care notes, rosters, timesheets, leave, complaints and invoices.

- **Frontend:** React 18 + Vite + Tailwind (`src/`). Builds to static files in `dist/`.
- **Backend:** Supabase, Sydney region (`ap-southeast-2`), project `wcrbdotwhvbukzcscktb`.
  - Postgres with Row Level Security on every table (`supabase/migrations/`).
  - Supabase Auth for sign-in (email + password, email codes, password reset).
  - Private `documents` storage bucket; files open through short-lived signed links.
  - One Edge Function, `api`, that serves every server action (`supabase/functions/api/`).

## Organisations (multi-company)

Each care agency using the app is an **organisation**. Every record has an `organisation_id`, and a restrictive Row Level Security policy on every table means people only ever see their own organisation's records, on top of the usual admin / worker / client rules.

- People join an organisation when an admin adds a worker or client record with their email, or sends an invitation (Organisation page). If they signed up first, they are linked as soon as that record or invitation is added. One account belongs to one organisation.
- Platform admins (`profiles.is_platform_admin`, set by hand in the database) add new organisations and invite each one's first admin from the Organisation page.
- Server functions: `app.asServiceRole.entities` is limited to the caller's organisation automatically. `platformEntities()` is not, and is only for platform admin actions.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:5173.

## Deploy

**Database:** migrations in `supabase/migrations/` are applied to the Supabase project. Add new changes as new migration files; never edit an applied one.

**Server functions:** the GitHub Actions workflow `.github/workflows/deploy-supabase.yml` deploys the `api` function when `supabase/functions/` changes on `main`, or when run by hand. It needs the repository secret `SUPABASE_ACCESS_TOKEN` (a personal access token from Supabase, Account > Access tokens).

Function secrets, set in Supabase under Edge Functions > Secrets:

| Secret | Purpose |
| --- | --- |
| `ALLOWED_ORIGINS` | Optional. Comma-separated origins allowed to call the API. Defaults to `https://caresyncpro1.com,https://www.caresyncpro1.com,https://care-sync-pro-1.netlify.app,http://localhost:5173`. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Optional. Sends app emails through Resend. Emails are skipped when unset. |
| `ANTHROPIC_API_KEY` | Optional. Enables the AI care-note and roster helpers. Only set this once you have decided client information may be sent to the AI provider. |
| `ANTHROPIC_MODEL` | Optional. Overrides the AI model (default `claude-opus-5-5`). |

**Website:** hosted on Netlify, which rebuilds and publishes the site from `main` automatically using `netlify.toml` (build settings, page routing and security headers). The domain caresyncpro1.com points to Netlify through DNS records in cPanel; email stays on cPanel.

The workflow also uploads a built `website` artifact you can download and upload.

## Supabase Auth settings

In Supabase under Authentication:

- **URL configuration:** Site URL `https://caresyncpro1.com`; redirect URLs `https://caresyncpro1.com/**`, `https://www.caresyncpro1.com/**`, `http://localhost:5173/**`.
- **Email templates:** the sign-up confirmation email must include `{{ .Token }}`, because the app asks for the 6-digit code.
- **SMTP:** set a custom SMTP sender for production; the built-in sender is rate-limited.
- Turn on leaked-password protection.

## First admin

Sign up in the app, then run in the Supabase SQL editor:

```sql
update public.profiles set role = 'admin', is_owner = true where email = 'you@example.com';
```

`is_owner` marks the business owner (Level 12, CEO). Only one person should have it.

## Privacy and security

Client personal and health information is stored only in Australia (Supabase Sydney). Access is enforced in the database: support workers see their own shifts and assigned clients, clients see their own records, and admins manage everything. Owner-only tables control staff access levels. Before going live, complete a privacy policy, a data breach response plan and a privacy impact assessment (NSW HRIP Act, Privacy Act APPs, NDIS Practice Standards).
