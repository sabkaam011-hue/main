# Cashfree Payment Gateway

Sabkaam integrates Cashfree's PG API (`x-api-version: 2025-01-01`, configurable) with the official `@cashfreepayments/cashfree-js` checkout SDK.

**Without credentials, payments are disabled, never faked.** The "Pay" button shows a clear message, `POST /api/payments/create-order` returns `503 not_configured`, and the admin overview shows a warning.

## How the flow works

```
User clicks Pay
  → POST /api/payments/create-order   (logged-in user; amount read from the DB fee snapshot, never the client)
      → reuse an ACTIVE order < 25 min old, or insert payments row (created) → Cashfree POST /orders
      ← payment_session_id
  → cashfree.checkout({ paymentSessionId })   (Cashfree-hosted page; Sabkaam never sees card/UPI data)
  → redirect to /payments/return?order_id=…
      → syncOrder(): GET /orders/{id} + GET /orders/{id}/payments from Cashfree (server-side)
Cashfree → POST /api/payments/webhook
      → verify signature on RAW body → store event (sha256 de-dupe) → syncOrder()   (never trusts payload status)
```

`syncOrder()` is idempotent and safe to call concurrently from the return page, the webhook and the admin "Re-check" button:
- It verifies the gateway amount equals the stored amount (mismatch → `failed: amount_mismatch`).
- `payments.status → success` uses a conditional update, so only the first caller wins.
- A partial unique index allows **only one successful payment per application**. A second successful order (for example, the user paid in two tabs) is flagged `refund_pending: duplicate_payment` for an admin to refund.
- The application moves `payment_pending → payment_successful`, a history row is written and the user is notified.

Statuses handled: success, failed, user-dropped/cancelled (order stays payable), expired/terminated, refund pending, refunded and partially refunded.

## Configuration

1. Cashfree Merchant Dashboard → **Developers → API Keys**. Generate **Test** keys first.
2. `.env.local` / host environment (server-only; never prefix with `NEXT_PUBLIC_`):
```
CASHFREE_ENV=sandbox
CASHFREE_CLIENT_ID=TEST...
CASHFREE_CLIENT_SECRET=cfsk_ma_test_...
CASHFREE_API_VERSION=2025-01-01
NEXT_PUBLIC_SITE_URL=https://<public https url>
```
3. **Webhooks:** Dashboard → Developers → Webhooks → add `https://<your-domain>/api/payments/webhook` for payment events (success, failed, user dropped) and refund events. Webhooks are signed with your client secret (`base64(HMAC-SHA256(x-webhook-timestamp + rawBody))`), which is what `verifyWebhookSignature()` checks.
4. **Domain whitelisting:** Cashfree requires your production domain to be approved for checkout and return URLs. Add it in the dashboard before going live.

### Testing locally
Cashfree can't reach `localhost`, so expose your dev server over HTTPS:
```bash
npx cloudflared tunnel --url http://localhost:3000     # or: ngrok http 3000
```
Set `NEXT_PUBLIC_SITE_URL` to the tunnel URL, restart `npm run dev`, and register the tunnel's `/api/payments/webhook` in the **test** dashboard. `notify_url` is only sent when the site URL is HTTPS. Without a tunnel, the return page still verifies payments via the API, so the flow completes but you won't exercise webhooks.

Use the sandbox test instruments from Cashfree's documentation (test cards, UPI and net banking) to simulate success, failure and user-dropped cases.

## Refunds
Admin → **Payments & refunds** → *Refund…* (admins only). Enter an optional partial amount and a required reason. The refund ID is reserved in the database before calling `POST /orders/{id}/refunds` with an idempotency key, so double-clicks cannot create two refunds. Final status arrives via the refund webhook (or *Re-check*).

## Go-live checklist
- [ ] Production keys in the host's environment; `CASHFREE_ENV=production`
- [ ] Production webhook URL registered; one test webhook delivered (check the `payment_webhooks` table: `signature_valid = true`, `processed_at` set)
- [ ] Domain whitelisted in Cashfree
- [ ] Receipt template (`src/app/dashboard/payments/[id]/receipt/page.tsx`) updated with legal entity name, address and GSTIN; GST invoicing reviewed with your CA
- [ ] Refund Policy reviewed by counsel and linked in the Cashfree dashboard
- [ ] Real ₹1-level transaction tested end to end, then refunded
