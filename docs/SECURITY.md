# Security & privacy

## Controls in place

| Risk | Control | Where |
|---|---|---|
| Users reading others' data | Postgres **RLS** on every table; storage policies by `{user_id}/…` folder | `supabase/migrations/*_rls.sql`, `*_storage.sql`, tested in `tests/database.test.ts` |
| Privilege escalation | Roles only in `admin_users` (admin-write only); column-level grants limit which profile and notification columns users may update; every admin action re-checks role server-side | `20261120000002_rls.sql`, `src/actions/admin.ts`, `src/lib/auth.ts` |
| Tampered fees / fake payments | Applications and payments are inserted only by server code with the service role. The fee is snapshotted from `services`; the payment amount comes from the DB; success is set only after Cashfree's API confirms, with an amount check | `src/actions/applications.ts`, `src/lib/payments/service.ts` |
| Forged webhooks | HMAC-SHA256 signature on the raw body with `timingSafeEqual`; payload status is ignored and status is re-fetched from Cashfree | `src/app/api/payments/webhook/route.ts` |
| Duplicate processing | Unique `event_hash`, conditional status updates, one-success-per-application unique index, reserved refund IDs and idempotency keys | as above |
| Secret leakage | Secrets are only in server env vars; `server-only` guards on server modules; no secrets carry the `NEXT_PUBLIC_` prefix | `src/lib/supabase/admin.ts`, `src/lib/payments/cashfree.ts` |
| Malicious uploads | 5 MB limit, file type sniffed from **magic bytes** (PDF/JPG/PNG/WEBP only), sanitised names, private bucket, 60-second signed URLs, uploads allowed only after payment | `src/lib/files.ts`, bucket config |
| Open redirects | `safeNextPath()` accepts only same-site relative paths | `src/lib/utils.ts` |
| Abuse / brute force | Rate limits on search, payment creation, assistance requests, uploads and the support form (plus Supabase's own OTP limits); honeypot field on the support form | `src/lib/rate-limit.ts` |
| Input validation | Zod schemas on every server action and API route; DB `check` constraints as a second layer | `src/actions/*`, migrations |
| Clickjacking / sniffing | `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`; `poweredByHeader: false` | `next.config.ts` |
| Card data | Never touches Sabkaam: Cashfree-hosted checkout | — |

## Data minimisation
- The assistance form asks for name, mobile and State only, and explicitly tells users **not** to type Aadhaar, PAN or bank numbers.
- Documents are uploaded only after payment, and only those the service needs (the uploader suggests the service's document list).
- Support and assistance forms warn against sharing ID or financial numbers.

## Before scaling to multiple instances
`src/lib/rate-limit.ts` is in-memory (per instance). Replace the store with Redis/Upstash, keeping the `rateLimit(key, limit, windowMs)` signature.

## Recommended next steps
- Content-Security-Policy header (allow `sdk.cashfree.com`, `*.cashfree.com` frames and your Supabase URL)
- Malware scanning of uploads (e.g. a Supabase Edge Function with ClamAV, or a scanning API) before staff open files
- Data-retention job: delete documents N days after a request is completed or cancelled
- Audit log table for admin actions (status changes are already in `application_status_history` with `changed_by`)
- MFA for staff/admin accounts
