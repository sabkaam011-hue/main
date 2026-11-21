import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { cashfreeConfig, verifyWebhookSignature } from "@/lib/payments/cashfree";
import { applyRefundStatus, syncOrder } from "@/lib/payments/service";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";

/**
 * Cashfree webhook endpoint (configure in Cashfree dashboard → Developers → Webhooks).
 * 1. Verifies the HMAC signature against the RAW body.
 * 2. De-duplicates deliveries (sha256 of timestamp+body is UNIQUE in payment_webhooks).
 * 3. Never trusts payload status: re-fetches order/refund status from Cashfree's API.
 */
export async function POST(req: NextRequest) {
  if (!isServiceRoleConfigured()) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const raw = await req.text();
  const ts = req.headers.get("x-webhook-timestamp");
  const sig = req.headers.get("x-webhook-signature");
  const valid = verifyWebhookSignature(raw, ts, sig, cashfreeConfig().clientSecret);

  let payload: Record<string, unknown> | null = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = null;
  }
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const data = (payload?.data ?? {}) as any;
  const type = String(payload?.type ?? "");
  const orderId: string | null = data?.order?.order_id ?? data?.refund?.order_id ?? null;
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const db = createAdminClient();
  const eventHash = createHash("sha256").update(`${ts}.${raw}`).digest("hex");
  const { data: event, error: insErr } = await db
    .from("payment_webhooks")
    .insert({ event_hash: eventHash, event_type: type || null, order_id: orderId, signature_valid: valid, payload: valid ? payload : null })
    .select("id")
    .maybeSingle();

  if (!valid) return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  if (insErr?.code === "23505") return NextResponse.json({ ok: true, duplicate: true }); // already received
  if (insErr || !event) return NextResponse.json({ error: "storage error" }, { status: 500 });

  try {
    if (type.startsWith("REFUND") && orderId && data?.refund?.refund_id) {
      await applyRefundStatus(orderId, String(data.refund.refund_id));
    } else if (orderId) {
      await syncOrder(orderId);
    }
    await db.from("payment_webhooks").update({ processed_at: new Date().toISOString() }).eq("id", event.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook] processing failed", err);
    await db.from("payment_webhooks").update({ error: String(err).slice(0, 500) }).eq("id", event.id);
    // Allow Cashfree to retry: remove the dedupe marker for this delivery.
    await db.from("payment_webhooks").update({ event_hash: `${eventHash}:failed:${event.id}` }).eq("id", event.id);
    return NextResponse.json({ error: "processing error" }, { status: 500 });
  }
}
