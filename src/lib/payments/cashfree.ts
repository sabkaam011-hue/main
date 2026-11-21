import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Minimal, typed Cashfree Payment Gateway client (PG API, server-side only).
 * Docs: https://www.cashfree.com/docs/api-reference/payments/latest/overview
 * Secrets are read from environment variables and must never reach the browser.
 */

export type CashfreeEnv = "sandbox" | "production";

export function cashfreeConfig() {
  const env: CashfreeEnv = process.env.CASHFREE_ENV === "production" ? "production" : "sandbox";
  return {
    env,
    clientId: process.env.CASHFREE_CLIENT_ID ?? "",
    clientSecret: process.env.CASHFREE_CLIENT_SECRET ?? "",
    apiVersion: process.env.CASHFREE_API_VERSION || "2025-01-01",
    baseUrl: env === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg",
  };
}

export function isCashfreeConfigured() {
  const c = cashfreeConfig();
  return Boolean(c.clientId && c.clientSecret);
}

export class CashfreeError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(message);
  }
}

async function cf<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
  const c = cashfreeConfig();
  if (!c.clientId || !c.clientSecret) throw new CashfreeError("Cashfree is not configured", 503, null);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-api-version": c.apiVersion,
    "x-client-id": c.clientId,
    "x-client-secret": c.clientSecret,
  };
  if (init.idempotencyKey) headers["x-idempotency-key"] = init.idempotencyKey;
  const res = await fetch(`${c.baseUrl}${path}`, { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg = (body as { message?: string })?.message ?? `Cashfree request failed (${res.status})`;
    throw new CashfreeError(msg, res.status, body);
  }
  return body as T;
}

/* ─────────── types (subset of fields we use) ─────────── */
export interface CfOrder {
  cf_order_id: string;
  order_id: string;
  order_amount: number;
  order_currency: string;
  order_status: "ACTIVE" | "PAID" | "EXPIRED" | "TERMINATED" | "TERMINATION_REQUESTED";
  payment_session_id: string;
  order_expiry_time?: string;
}

export interface CfPayment {
  cf_payment_id: string | number;
  order_id: string;
  payment_status: "SUCCESS" | "NOT_ATTEMPTED" | "FAILED" | "USER_DROPPED" | "VOID" | "CANCELLED" | "PENDING";
  payment_amount: number;
  payment_currency: string;
  payment_message?: string;
  payment_time?: string;
  payment_completion_time?: string;
  payment_group?: string;
}

export interface CfRefund {
  cf_refund_id: string;
  refund_id: string;
  order_id: string;
  refund_amount: number;
  refund_status: "SUCCESS" | "PENDING" | "CANCELLED" | "ONHOLD" | "FAILED" | string;
  status_description?: string;
  processed_at?: string;
}

/* ─────────── API calls ─────────── */
export function createOrder(input: {
  orderId: string;
  amountPaise: number;
  customer: { id: string; phone: string; email?: string; name?: string };
  returnUrl: string;
  notifyUrl?: string;
  note?: string;
  expiresAt?: Date;
}) {
  const ist = (d: Date) => new Date(d.getTime() + 5.5 * 3600_000).toISOString().replace(/\.\d+Z$/, "+05:30");
  return cf<CfOrder>("/orders", {
    method: "POST",
    idempotencyKey: input.orderId,
    body: JSON.stringify({
      order_id: input.orderId,
      order_amount: Number((input.amountPaise / 100).toFixed(2)),
      order_currency: "INR",
      customer_details: {
        customer_id: input.customer.id,
        customer_phone: input.customer.phone,
        customer_email: input.customer.email || undefined,
        customer_name: input.customer.name || undefined,
      },
      order_meta: { return_url: input.returnUrl, notify_url: input.notifyUrl },
      order_note: input.note?.slice(0, 200),
      order_expiry_time: input.expiresAt ? ist(input.expiresAt) : undefined,
    }),
  });
}

export const getOrder = (orderId: string) => cf<CfOrder>(`/orders/${encodeURIComponent(orderId)}`);
export const getOrderPayments = (orderId: string) => cf<CfPayment[]>(`/orders/${encodeURIComponent(orderId)}/payments`);

export function createRefund(orderId: string, input: { refundId: string; amountPaise: number; note?: string }) {
  return cf<CfRefund>(`/orders/${encodeURIComponent(orderId)}/refunds`, {
    method: "POST",
    idempotencyKey: input.refundId,
    body: JSON.stringify({
      refund_id: input.refundId,
      refund_amount: Number((input.amountPaise / 100).toFixed(2)),
      refund_note: input.note?.slice(0, 100),
    }),
  });
}

export const getRefund = (orderId: string, refundId: string) =>
  cf<CfRefund>(`/orders/${encodeURIComponent(orderId)}/refunds/${encodeURIComponent(refundId)}`);

/* ─────────── webhook signature ─────────── */
/**
 * Cashfree signs webhooks as base64(HMAC-SHA256(timestamp + rawBody, clientSecret)),
 * sent in the x-webhook-signature header with the timestamp in x-webhook-timestamp.
 * The raw body must be used exactly as received (no JSON re-serialisation).
 */
export function computeWebhookSignature(rawBody: string, timestamp: string, secret: string) {
  return createHmac("sha256", secret).update(timestamp + rawBody).digest("base64");
}

export function verifyWebhookSignature(rawBody: string, timestamp: string | null, signature: string | null, secret: string) {
  if (!timestamp || !signature || !secret) return false;
  const expected = Buffer.from(computeWebhookSignature(rawBody, timestamp, secret));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
