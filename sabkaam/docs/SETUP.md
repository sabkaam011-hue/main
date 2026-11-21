# Setup & local development

## 1. Prerequisites
- Node.js **22.18+** (runs the TypeScript seed script natively) and npm
- A Supabase project (free tier is fine). Choose the **Mumbai (ap-south-1)** region for Indian users.
- Optional: [Supabase CLI](https://supabase.com/docs/guides/cli) for migrations and local Supabase (needs Docker)
- Optional: Cashfree merchant account (see [CASHFREE.md](CASHFREE.md))

## 2. Install
```bash
npm install
cp .env.example .env.local
```

## 3. Create the database

### Option A: Supabase CLI (recommended)
```bash
npx supabase login
npx supabase init          # creates supabase/config.toml; keep the existing migrations folder
npx supabase link --project-ref <your-project-ref>
npx supabase db push       # applies supabase/migrations/*
```
Then load the demo catalogue: open **SQL Editor → New query**, paste `supabase/seed.sql`, and run it. Or use `psql "$DATABASE_URL" -f supabase/seed.sql`.

For a fully local stack: `npx supabase start`, then `npx supabase db reset` (applies migrations **and** `seed.sql`).

### Option B: SQL Editor only
Run these files **in order** in the Supabase SQL Editor:
1. `supabase/migrations/20261120000001_init.sql`: tables, enums, triggers, indexes
2. `supabase/migrations/20261120000002_rls.sql`: Row Level Security policies
3. `supabase/migrations/20261120000003_storage.sql`: private `documents` bucket and storage policies
4. `supabase/seed.sql`: 8 categories, 55 demo services, keywords and FAQs (safe to re-run)

## 4. Environment variables
From **Project Settings → API**, fill `.env.local`:

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # server only; never expose
```

`SUPABASE_SERVICE_ROLE_KEY` is used only in server code (`src/lib/supabase/admin.ts` is marked `server-only`, so the build fails if a client component imports it).

## 5. Authentication providers
Supabase → **Authentication → URL Configuration**:
- Site URL: `http://localhost:3000` (production: your domain)
- Redirect URLs: `http://localhost:3000/auth/callback`, `https://<your-domain>/auth/callback`

### Email OTP (easiest for development)
Authentication → Providers → **Email**: enabled. To send a **code** rather than a link, edit **Authentication → Email Templates → Magic Link** so it includes `{{ .Token }}`, for example:
```html
<h2>Your Sabkaam login code</h2><p>Enter this code: <strong>{{ .Token }}</strong></p>
```
For production, configure custom SMTP (Authentication → SMTP), because the built-in sender is heavily rate-limited.

### Mobile OTP (primary method for production)
Authentication → Providers → **Phone**: enable and connect an SMS provider that Supabase supports, or use the **Send SMS Auth Hook** to call an Indian provider. **In India, commercial SMS requires DLT registration** (entity, sender ID/header and an approved OTP template) with your telecom operator before messages will deliver. Toggle the method in the UI with `NEXT_PUBLIC_AUTH_PHONE_ENABLED`.

### Google
1. Google Cloud Console → Credentials → OAuth client (Web). Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
2. Supabase → Providers → **Google**: paste the client ID and secret.
3. Set `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true`.

Sessions use secure, HTTP-only cookies via `@supabase/ssr`. `src/proxy.ts` refreshes them and redirects anonymous users away from `/dashboard`, `/admin` and `/assist`. There are no passwords, so no password-reset flow is needed.

## 6. Create your admin account
1. Run the app and **sign up** through `/login` with your phone or email.
2. In the Supabase SQL Editor, promote yourself:
```sql
-- by email
insert into public.admin_users (user_id, role)
select id, 'admin' from auth.users where email = 'you@example.com'
on conflict (user_id) do update set role = 'admin';

-- or by phone (Supabase stores it without '+')
insert into public.admin_users (user_id, role)
select id, 'admin' from auth.users where phone = '919876543210'
on conflict (user_id) do update set role = 'admin';
```
3. Reload. **Admin** appears in the navbar. From **Admin → Users & roles**, admins can make other users `staff` or `admin`.

| Role | Can do |
|---|---|
| user | Browse, save, request assistance, pay, upload own documents, track own requests |
| staff | All of the above, plus view all requests and documents, update status, re-check payments, support inbox |
| admin | All of the above, plus services/categories/FAQs/homepage content, fees, assignments, refunds, roles |

Roles live in `admin_users`, not on `profiles`, so a user can never grant themselves a role by editing their profile. RLS enforces this in the database (see `tests/database.test.ts`).

## 7. Run
```bash
npm run dev
npm run check     # typecheck + lint + tests before committing
```

## 8. Editing the demo catalogue
- **In production:** use **Admin → Services & listings**. Changes reach the public site and search index within about 60 seconds.
- **Before first deploy:** edit `src/lib/catalogue/services.ts`, then `npm run db:seed:generate` and re-run `seed.sql`. The seed uses `on conflict do nothing`, so existing rows are not overwritten.
