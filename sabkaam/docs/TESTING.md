# Testing

## Automated (`npm test`)
| Suite | Covers |
|---|---|
| `tests/search.test.ts` | "PAN" returns the 5 PAN services; "loan" returns Mudra, PMEGP, education, agriculture and business loans; Hindi; Hinglish and synonyms; typos; prefix-as-you-type; alias-only matches; no-results with related services; normalisation |
| `tests/security.test.ts` | Cashfree webhook signature (valid and every tampering case), upload magic-byte sniffing, filename sanitising, open-redirect protection |
| `tests/database.test.ts` | Applies **all real migrations and the seed** to Postgres (PGlite) and checks seed idempotency, all-demo flag, signup profile trigger, one-success-per-application, https-only official URLs, and **RLS**: cross-user isolation, no client-side application/payment inserts, no self status changes, no privilege escalation, unpublished visibility, staff read vs admin write, and document-upload rules |

`npm run check` runs typecheck + lint + tests. Run it in CI on every PR.

## Manual checklist

### Public site
- [ ] Homepage renders at 360 px, 768 px, 1280 px and 1536 px; no horizontal scroll
- [ ] Mobile menu opens and closes, closes on navigation and on Esc
- [ ] Language switch EN ⇄ हिन्दी updates navbar, hero, cards and `<html lang>`, and persists after reload
- [ ] Search: type `pan`, `loan`, `पैन`, `scolarship`, `sarkari naukri`, `xyzabc`. Check suggestions, category labels, descriptions, did-you-mean, related and the help link
- [ ] Search keyboard: ↓/↑/Enter opens a service; Esc closes; Enter with no selection opens `/search`
- [ ] Popular chips, category cards, "View all" links and filters all navigate correctly
- [ ] Service page: demo warning, official link opens in a new tab, fee and scope, FAQs expand, related services
- [ ] 404 page for unknown routes and unknown service slugs
- [ ] `/sitemap.xml` lists services; `/robots.txt` disallows private areas

### Auth
- [ ] Email OTP: send, wrong code shows an error, correct code logs in and returns to `?next=`
- [ ] Phone OTP (with SMS provider): same; resend cooldown works
- [ ] Google: round-trip through `/auth/callback`
- [ ] `/dashboard`, `/admin` and `/assist/...` redirect to login when logged out
- [ ] Logout clears the session (desktop dashboard sidebar and mobile menu)

### Assistance & payments (Cashfree sandbox + tunnel)
- [ ] Request assistance: validation errors on name/phone/consents; success shows reference `SK…`
- [ ] Repeating the request for the same service opens the existing open request
- [ ] Pay → Cashfree sandbox → success → return page shows **verified** success; application is `Payment Successful`; notification created
- [ ] Failed / closed checkout → return page shows not completed; Pay works again
- [ ] Webhook received: `payment_webhooks.signature_valid = true`, `processed_at` set; re-delivery is de-duplicated
- [ ] A webhook POST with a bad signature returns 401
- [ ] Changing the amount in the browser has no effect (the server ignores it)
- [ ] Receipt page shows correct details and prints
- [ ] Cancel works only while payment is pending

### Documents
- [ ] Upload is blocked before payment; allowed after
- [ ] A 6 MB file or a renamed `.exe` → `.pdf` is rejected
- [ ] Download link works for the owner and for staff; another user gets 404
- [ ] Delete removes both the file and the row

### Admin
- [ ] A normal user visiting `/admin` is redirected with "no access"
- [ ] Staff sees requests, payments, users and support but **not** services, categories or content
- [ ] Status update writes history and notifies the user; work states are blocked without a verified payment
- [ ] Assignment (admin only)
- [ ] Service create/edit/unpublish/delete; keywords affect search within about 1 minute; Verified stamps the date; a service with applications can't be deleted
- [ ] Categories, FAQs and announcement banner edits appear on the homepage
- [ ] Refund (sandbox): full and partial; double submission is prevented; status updates after the refund webhook
- [ ] Role changes; an admin can't demote themselves
- [ ] Analytics numbers match the database
