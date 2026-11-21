# Deployment

## Vercel (recommended)
1. Push the repo to GitHub and import it in Vercel (framework preset: Next.js).
2. **Project → Settings → Functions → Region:** `bom1` (Mumbai), close to your Supabase region.
3. Add every variable from `.env.example` for **Production** (and Preview if needed). `NEXT_PUBLIC_SITE_URL` must be your final `https://` domain; it's used for canonical URLs, the sitemap and payment return/webhook URLs.
4. Deploy, then add your custom domain.
5. Supabase → Auth → URL Configuration: set the Site URL and add `https://<domain>/auth/callback`.
6. Cashfree: register `https://<domain>/api/payments/webhook` and whitelist the domain ([CASHFREE.md](CASHFREE.md)).

## Other Node hosts (Render, Railway, a VM, Docker)
```bash
npm ci
npm run build
NODE_ENV=production npm start   # port 3000; put HTTPS (nginx/Caddy) in front
```
Make sure the reverse proxy forwards `X-Forwarded-For` (used for rate limiting).

## Production checklist
- [ ] All migrations applied; `seed.sql` loaded, **or** your own verified catalogue entered
- [ ] Every public service reviewed and set to **Verified** (or unpublished) — see [CONTENT.md](CONTENT.md)
- [ ] Sample fees replaced with real fees
- [ ] Admin account created; staff invited via Admin → Users & roles
- [ ] Phone OTP: SMS provider and **DLT** registration complete; custom SMTP for email
- [ ] Legal pages reviewed by counsel; company name, address, GSTIN and Grievance Officer added (the templates show a "review before launch" banner, which you remove in `src/components/layout/prose-page.tsx` via `template={false}`)
- [ ] Sample testimonials replaced or the section removed (`src/app/page.tsx`)
- [ ] Rate limiting backed by Redis/Upstash if running more than one instance ([SECURITY.md](SECURITY.md))
- [ ] Supabase: Point-in-Time Recovery / backups enabled; leaked-password and MFA settings reviewed for admin accounts
- [ ] Error monitoring (e.g. Sentry) and uptime checks on `/` and `/api/search?q=pan`
- [ ] `npm run check` passes in CI
- [ ] Submit `https://<domain>/sitemap.xml` to Google Search Console
