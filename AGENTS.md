# AGENTS.md

## Project context

CareSync Pro is a care-agency app holding client personal and health information. Treat it as user-owned code, keep changes focused, and keep the privacy rules in the database intact. See `README.md` for setup and deployment.

## Key files

- `src/api/client.js`: the only Supabase client in the frontend. Exposes `api.entities`, `api.auth`, `api.functions` and `api.files`.
- `supabase/functions/_shared/entities.js`: entity-to-table map and query compiler, shared by the frontend and the Edge Function.
- `supabase/functions/api/`: the single `api` Edge Function; each server action is a handler in `handlers/`, routed by name in `index.ts`.
- `supabase/migrations/`: database schema and Row Level Security. Add new migrations; never edit applied ones.

## Working notes

- Every table has RLS. New tables need policies before they hold data. Security-definer helpers live in the `private` schema.
- Never put secrets in `VITE_` variables or commit `.env.local`.
- Run `npm run lint` and `npm run build` before finishing frontend changes.
