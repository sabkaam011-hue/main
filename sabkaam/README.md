# Sabkaam — *Har zaroori kaam, ek jagah.*

A citizen-services platform where people in India can discover government schemes, loans, scholarships, jobs, exams, documents, health, housing and business services, understand eligibility in plain Hindi or English, and request **paid application assistance**.

> **Sabkaam is a private assistance platform, not a government website.** The UI says so on every service page, in the footer, at checkout and on receipts. It never guarantees approval.

**Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · shadcn-style UI primitives · Supabase (Postgres, Auth, Storage, RLS) · Cashfree Payment Gateway · Vitest

---

## What's included

| Area | Status |
|---|---|
| Brand & design system (navy/teal/amber tokens, self-hosted Plus Jakarta Sans + Noto Sans Devanagari) | ✅ |
| Responsive navbar with mobile menu and EN/हिन्दी switcher | ✅ |
| **Universal search**: live suggestions, Hindi/English/Hinglish, synonyms, typo tolerance, prefix-as-you-type, category labels, did-you-mean, related results, no-results + help CTA, keyboard navigation | ✅ (local engine, tested) |
| Homepage (hero search → categories → schemes/loans/scholarships/jobs/documents → how it works → CTA → sample testimonials → FAQ → footer) | ✅ |
| SEO service pages (`/service/[slug]`): overview, benefits, eligibility, documents, process, dates, official source, FAQs, fee & scope, JSON-LD | ✅ |
| Category pages, all-services filter, search results page | ✅ |
| Auth: mobile OTP, email OTP, Google (Supabase) — browsing needs no login | ✅ |
| User dashboard: overview, applications + status history + next steps, saved, documents, payments + receipts, notifications, profile & settings | ✅ |
| Assistance workflow: eligibility self-check → fee & scope → consent → request → pay → upload → staff review → tracking | ✅ |
| Cashfree: server-side order creation, server-side verification, signed + de-duplicated webhooks, idempotent processing, refunds | ✅ (needs your keys) |
| Admin panel with RBAC (staff/admin): services & listings CRUD with verification workflow, categories, FAQs & homepage content, requests (status + assignment), payments & refunds, users & roles, support inbox, analytics | ✅ |
| Postgres schema, RLS, private storage, seed | ✅ (validated in tests) |
| Privacy, Terms, Refund Policy, Disclaimer (templates), sitemap, robots, 404/error/loading states | ✅ |

### Data honesty
All **55 seeded services are marked `demo`**. Each public page shows a "Demo data" warning until an editor verifies it against the official source in the admin panel. Seed content is deliberately high-level, links only to official portals, and avoids specific amounts and deadlines. Fees are sample values. See [docs/CONTENT.md](docs/CONTENT.md).

---

## Quick start (catalogue-only mode, no accounts needed)

```bash
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
```

With no Supabase keys, the public site, search, categories and service pages work from the bundled demo catalogue. Login, dashboard, admin and payments show clear "not configured" states and never pretend to work.

For the full app, follow **[docs/SETUP.md](docs/SETUP.md)**.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run check` | Typecheck + lint + tests |
| `npm test` | Vitest: search engine, webhook signatures, upload validation, redirect safety, **migrations + RLS against real Postgres (PGlite)** |
| `npm run db:seed:generate` | Regenerate `supabase/seed.sql` from `src/lib/catalogue/*` |

## Documentation

- [docs/SETUP.md](docs/SETUP.md): Supabase, auth providers, local development, **admin account**
- [docs/CASHFREE.md](docs/CASHFREE.md): payment configuration, webhooks, testing, go-live
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): Vercel and other hosts, production checklist
- [docs/SECURITY.md](docs/SECURITY.md): threat model and controls
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): code map, data flow, search design, extending languages and AI search
- [docs/CONTENT.md](docs/CONTENT.md): verification workflow for scheme data
- [docs/TESTING.md](docs/TESTING.md): automated tests and the **manual testing checklist**
