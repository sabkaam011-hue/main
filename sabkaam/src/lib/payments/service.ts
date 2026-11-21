import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/utils";
import {
  CashfreeError,
  createOrder,
  createRefund,
  getOrder,
  getOrderPayments,
  getRefund,
  isCashfreeConfigured,
  cashfreeConfig,
  type CfPayment,
} from "./cashfree";

/**
 * Payment orchestration. All state changes are:
 *  - derived from Cashfree's API (never from browser redirects or client input),
 *  - idempotent (conditional updates + unique constraints), so webhooks, retries
 *    and the return page can all call syncOrder() safely and concurrently.
 */

const ORDER_TTL_MS = 30 * 60_000;
const REUSE_WINDOW_MS = 25 * 60_000;

export type StartPaymentResult =
  | { ok: true; paymentSessionId: string; orderId: string; mode: "sandbox" | "production" }
  | { ok: false; code: "not_configured" | "not_found" | "not_payable" | "already_paid" | "gateway_error"; message: string };

export async function startPayment(userId: string, applicationId: string): Promise<StartPaymentResult> {
  if (!isCashfreeConfigured()) {
    return {
      ok: false,
      code: "not_configured",
      message: "Online payments are not configured yet. Set CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET (see docs/CASHFREE.md).",
    };
  }
  const db = createAdminClient();

  const { data: app } = await db
    .from("applications")
    .select("id, reference, user_id, status, fee_paise, applicant_name, applicant_phone, services(title)")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app || app.user_id !== userId) return { ok: false, code: "not_found", message: "Application not found." };
  if (app.status !== "payment_pending" || app.fee_paise <= 0) {
    return { ok: false, code: "not_payable", message: "This application does not need a payment right now." };
  }

  const { data: existingSuccess } = await db.from("payments").select("id").eq("application_id", app.id).eq("status", "success").maybeSingle();
  if (existingSuccess) return { ok: false, code: "already_paid", message: "This application is already paid." };

  // Reuse a recent open order instead of creating duplicates (prevents double-charging across tabs).
  const { data: open } = await db
    .from("payments")
    .select("order_id, payment_session_id, amount_paise, created_at")
    .eq("application_id", app.id)
    .in("status", ["created", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (open?.payment_session_id && open.amount_paise === app.fee_paise && Date.now() - new Date(open.created_at).getTime() < REUSE_WINDOW_MS) {
    try {
      const order = await getOrder(open.order_id);
      if (order.order_status === "ACTIVE") {
        return { ok: true, paymentSessionId: open.payment_session_id, orderId: open.order_id, mode: cashfreeConfig().env };
      }
      if (order.order_status === "PAID") {
        await syncOrder(open.order_id);
        return { ok: false, code: "already_paid", message: "This application is already paid." };
      }
    } catch {
      /* fall through and create a new order */
    }
  }

  const orderId = `SK_${app.reference}_${Date.now().toString(36)}`.toUpperCase();
  const phone = String(app.applicant_phone).replace(/\D/g, "").slice(-10);
  const { data: authUser } = await db.auth.admin.getUserById(userId);
  const site = siteUrl();

  // Record the intent first so a webhook can never arrive for an unknown order.
  const { error: insErr } = await db.from("payments").insert({
    application_id: app.id,
    user_id: userId,
    order_id: orderId,
    amount_paise: app.fee_paise,
    status: "created",
  });
  if (insErr) return { ok: false, code: "gateway_error", message: "Could not start payment. Please try again." };

  try {
    const order = await createOrder({
      orderId,
      amountPaise: app.fee_paise,
      customer: { id: `u_${userId.replace(/-/g, "")}`, phone, email: authUser?.user?.email ?? undefined, name: app.applicant_name },
      returnUrl: `${site}/payments/return?order_id={order_id}`,
      notifyUrl: site.startsWith("https://") ? `${site}/api/payments/webhook` : undefined,
      note: `Sabkaam assistance ${app.reference}`,
      expiresAt: new Date(Date.now() + ORDER_TTL_MS),
    });
    await db
      .from("payments")
      .update({ cf_order_id: order.cf_order_id, payment_session_id: order.payment_session_id, status: "pending" })
      .eq("order_id", orderId);
    return { ok: true, paymentSessionId: order.payment_session_id, orderId, mode: cashfreeConfig().env };
  } catch (err) {
    const message = err instanceof CashfreeError ? err.message : "Payment gateway error";
    await db.from("payments").update({ status: "failed", failure_reason: message.slice(0, 300) }).eq("order_id", orderId);
    console.error("[payments] createOrder failed", err);
    return { ok: false, code: "gateway_error", message: "The payment gateway is unavailable. Please try again shortly." };
  }
}

/**
 * Fetches the authoritative order + payment status from Cashfree and applies it.
 * Safe to call any number of times.
 */
export async function syncOrder(orderId: string): Promise<{ status: string } | null> {
  const db = createAdminClient();
  const { data: payment } = await db.from("payments").select("*").eq("order_id", orderId).maybeSingle();
  if (!payment) return null;
  if (["success", "refunded", "partially_refunded", "refund_pending"].includes(payment.status)) return { status: payment.status };

  const [order, attempts] = await Promise.all([getOrder(orderId), getOrderPayments(orderId).catch(() => [] as CfPayment[])]);
  const succeeded = attempts.find((p) => p.payment_status === "SUCCESS");
  const latest = attempts[0];

  if (order.order_status === "PAID" || succeeded) {
    // Amount check: the gateway amount must match what we charged.
    if (Math.round(Number(order.order_amount) * 100) !== payment.amount_paise) {
      await db.from("payments").update({ status: "failed", failure_reason: "amount_mismatch", gateway_response: { order } }).eq("id", payment.id);
      console.error("[payments] amount mismatch", orderId);
      return { status: "failed" };
    }
    return markPaid(payment.id, payment.application_id, payment.user_id, {
      cf_payment_id: succeeded ? String(succeeded.cf_payment_id) : null,
      payment_method: succeeded?.payment_group ?? null,
      paid_at: succeeded?.payment_completion_time ?? succeeded?.payment_time ?? new Date().toISOString(),
      gateway_response: { order, payment: succeeded ?? null },
    });
  }

  if (order.order_status === "EXPIRED" || order.order_status === "TERMINATED") {
    await db
      .from("payments")
      .update({ status: order.order_status === "EXPIRED" ? "failed" : "cancelled", failure_reason: order.order_status.toLowerCase() })
      .eq("id", payment.id)
      .in("status", ["created", "pending"]);
    return { status: "failed" };
  }

  // Order still ACTIVE: reflect the latest failed attempt but keep it payable.
  if (latest && ["FAILED", "USER_DROPPED", "CANCELLED"].includes(latest.payment_status)) {
    await db
      .from("payments")
      .update({ failure_reason: (latest.payment_message || latest.payment_status).slice(0, 300) })
      .eq("id", payment.id);
  }
  return { status: "pending" };
}

async function markPaid(
  paymentId: string,
  applicationId: string,
  userId: string,
  fields: { cf_payment_id: string | null; payment_method: string | null; paid_at: string; gateway_response: unknown },
) {
  const db = createAdminClient();
  // Conditional update — only the first caller wins.
  const { data: updated, error } = await db
    .from("payments")
    .update({ status: "success", failure_reason: null, ...fields })
    .eq("id", paymentId)
    .neq("status", "success")
    .select("id")
    .maybeSingle();

  if (error) {
    // 23505 = unique violation on payments_one_success_per_app → this application was already paid by another order.
    if (error.code === "23505") {
      await db
        .from("payments")
        .update({ status: "refund_pending", failure_reason: "duplicate_payment", ...fields })
        .eq("id", paymentId);
      await notify(userId, "Duplicate payment received", "We received a second payment for the same request. It has been flagged for a refund.", `/dashboard/payments`);
      return { status: "refund_pending" };
    }
    throw error;
  }
  if (!updated) return { status: "success" }; // already processed

  const { data: moved } = await db
    .from("applications")
    .update({ status: "payment_successful" })
    .eq("id", applicationId)
    .in("status", ["submitted", "payment_pending"])
    .select("id, reference")
    .maybeSingle();
  if (moved) {
    await db.from("application_status_history").insert({
      application_id: applicationId,
      status: "payment_successful",
      note: "Payment verified with the payment gateway.",
    });
    await notify(userId, `Payment received for ${moved.reference}`, "Your payment was successful. Please upload the documents listed on your application page.", `/dashboard/applications/${applicationId}`);
  }
  return { status: "success" };
}

export async function notify(userId: string, title: string, body: string, link?: string) {
  await createAdminClient().from("notifications").insert({ user_id: userId, title, body, link: link ?? null });
}

/* ─────────── refunds (admin) ─────────── */
export async function refundPayment(paymentId: string, amountPaise: number | null, note: string, actorId: string) {
  const db = createAdminClient();
  const { data: p } = await db.from("payments").select("*").eq("id", paymentId).maybeSingle();
  if (!p) throw new Error("Payment not found");
  if (!["success", "refund_pending"].includes(p.status)) throw new Error("Only successful payments can be refunded");
  if (p.refund_id) throw new Error("A refund has already been initiated for this payment");
  const amount = amountPaise ?? p.amount_paise;
  if (amount <= 0 || amount > p.amount_paise) throw new Error("Invalid refund amount");

  const refundId = `RF_${p.order_id}`.slice(0, 40);
  // Reserve the refund id first (unique) so a double-click can't create two refunds.
  const { data: reserved } = await db
    .from("payments")
    .update({ refund_id: refundId, refund_amount_paise: amount, refund_status: "INITIATED", refund_note: note.slice(0, 300), status: "refund_pending" })
    .eq("id", p.id)
    .is("refund_id", null)
    .select("id")
    .maybeSingle();
  if (!reserved) throw new Error("A refund is already in progress");

  try {
    const r = await createRefund(p.order_id, { refundId, amountPaise: amount, note });
    await applyRefundStatus(p.order_id, r.refund_id, r.refund_status);
  } catch (err) {
    await db.from("payments").update({ refund_id: null, refund_status: "FAILED_TO_INITIATE", status: p.status }).eq("id", p.id);
    throw err;
  }
  await db.from("application_status_history").insert({
    application_id: p.application_id,
    status: (await db.from("applications").select("status").eq("id", p.application_id).single()).data?.status ?? "cancelled",
    note: `Refund of ₹${(amount / 100).toFixed(2)} initiated.`,
    changed_by: actorId,
  });
  await notify(p.user_id, "Refund initiated", `A refund of ₹${(amount / 100).toFixed(2)} has been initiated to your original payment method.`, "/dashboard/payments");
}

export async function applyRefundStatus(orderId: string, refundId: string, status?: string) {
  const db = createAdminClient();
  const s = status ?? (await getRefund(orderId, refundId)).refund_status;
  const { data: p } = await db.from("payments").select("id, amount_paise, refund_amount_paise").eq("order_id", orderId).maybeSingle();
  if (!p) return;
  const done = s === "SUCCESS";
  await db
    .from("payments")
    .update({
      refund_status: s,
      ...(done
        ? { status: (p.refund_amount_paise ?? p.amount_paise) < p.amount_paise ? "partially_refunded" : "refunded", refunded_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", p.id);
}
