# Architecture

## Code map
```
src/
  app/                      Next.js App Router
    page.tsx                Homepage
    services/ category/[slug]/ service/[slug]/ search/   Public catalogue (SEO pages)
    login/ auth/callback/ auth/signout/                  Supabase Auth
    assist/[slug]/          Assistance request (eligibility → details → consent)
    dashboard/…             User dashboard
    admin/…                 Staff/admin panel (role-checked in layout + every action)
    payments/return/        Post-checkout page (verifies server-side)
    api/search              Live search JSON (rate-limited, cacheable)
    api/payments/create-order, api/payments/webhook
    api/documents/[id]      Signed-URL download (RLS-checked)
    (legal)/…  help/  about/  sitemap.ts  robots.ts
  actions/                  Server actions (zod-validated): applications, admin, saved, locale
  components/               ui/ (primitives), layout/, search/, services/, home/, dashboard/, admin/, forms/, auth/
  lib/
    catalogue/              Types, categories, DEMO seed services
    data/catalogue.ts       Repository: Supabase → falls back to seed; 60 s in-process cache; builds search index
    search/                 engine.ts (pure), synonyms.ts, provider.ts (pluggable)
    payments/               cashfree.ts (API client + signature), service.ts (orchestration)
    supabase/               server / client / admin(service-role) clients
    i18n/                   dictionaries (en, hi), server + client helpers
    auth.ts applications.ts files.ts rate-limit.ts utils.ts
  proxy.ts                  Session refresh + auth gate (Next 16 "proxy", formerly middleware)
supabase/migrations, supabase/seed.sql, scripts/generate-seed.ts, tests/
```

## Request lifecycle (assistance)
`submitted → payment_pending → payment_successful → under_review ⇄ documents_required → in_progress → completed`
(or `rejected` / `cancelled`). Payment statuses are set only by the payment system. Staff can't move a paid request into work states unless a verified payment exists. Every change writes `application_status_history` and a user notification.

## Search
`src/lib/search/engine.ts` is a dependency-free engine run on the server:
1. **Normalise:** NFC, lowercase, strip punctuation, Devanagari nukta and chandrabindu normalisation.
2. **Expand** each token with synonym groups (English ⇄ Hinglish ⇄ Hindi, e.g. `loan ⇄ karz ⇄ ऋण ⇄ लोन`) and **fuzzy** vocabulary matches (Damerau-Levenshtein, length-scaled threshold). The last token also matches as a **prefix** for live typing.
3. **Score** fields (title > keywords/aliases > category > summary), weighted by match type, multiplied by query coverage², plus phrase bonuses and a small popularity/trending boost.
4. **Fallbacks:** did-you-mean suggestion, related services by inferred category, then popular services.

Keywords and aliases are editable per service in the admin panel (`service_keywords`). The index rebuilds when the catalogue cache refreshes.

**Semantic / AI search later:** implement `SearchProvider` in `src/lib/search/provider.ts` (e.g. pgvector embeddings stored in Supabase), merge with local results, and select it in `getSearchProvider()`. The database already has `pg_trgm` and a `tsvector` column with GIN indexes if you prefer to move lexical search into Postgres as the catalogue grows.

## Internationalisation
UI strings: `src/lib/i18n/dictionaries.ts`. The locale comes from the `sk_locale` cookie, `<html lang>` is set accordingly, and Devanagari has its own font fallback. Content: `title_hi` and `summary_hi` columns are shown in Hindi mode; long-form content currently falls back to English, with a notice.
**Adding a language** (e.g. Marathi): add `"mr"` to `LOCALES` with a dictionary, add `title_mr`/`summary_mr` columns (or move to a `service_translations` table for many languages), and extend `localizedTitle()`. For SEO-indexable translations, move the locale into the URL (`/hi/service/...`) with `hreflang` alternates.

## Rendering & caching
All pages render dynamically: the navbar reads the session and locale cookies. Catalogue reads hit an in-process 60-second cache, and admin writes invalidate it immediately on that instance. `cacheComponents` is intentionally off. If you adopt it later, move session/locale reads behind `<Suspense>` boundaries (see `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`).
