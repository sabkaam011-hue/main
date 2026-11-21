import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { syncOrder } from "@/lib/payments/service";
import { buttonVariants } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";

export const metadata = { title: "Payment status", robots: { index: false } };

type Props = { searchParams: Promise<{ order_id?: string }> };

/**
 * Cashfree redirects here after checkout. The redirect itself proves nothing:
 * we verify the order with Cashfree's API server-side before showing success.
 */
export default async function PaymentReturnPage({ searchParams }: Props) {
  const { order_id } = await searchParams;
  const user = await requireUser(`/payments/return?order_id=${order_id ?? ""}`);
  const supabase = await createClient();

  const { data: payment } = order_id
    ? await supabase.from("payments").select("id, order_id, application_id, amount_paise, status, failure_reason").eq("order_id", order_id).eq("user_id", user.id).maybeSingle()
    : { data: null };

  let status = payment?.status ?? "unknown";
  if (payment) {
    try {
      status = (await syncOrder(payment.order_id))?.status ?? status;
    } catch (e) {
      console.error("[payments/return] sync failed", e);
    }
  }

  const ui =
    status === "success"
      ? { Icon: CheckCircle2, cls: "bg-success-50 text-success", title: "Payment successful", text: "Your payment has been verified. Next, upload the documents listed on your application page." }
      : status === "failed" || status === "cancelled"
        ? { Icon: XCircle, cls: "bg-danger-50 text-danger", title: "Payment not completed", text: payment?.failure_reason ? `Reason: ${payment.failure_reason}. You can try again from your application page.` : "You can try again from your application page." }
        : { Icon: Clock, cls: "bg-warn-50 text-warn", title: "Payment pending", text: "We haven't received confirmation from the payment gateway yet. This page and your dashboard will update automatically once it's confirmed." };

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${ui.cls}`}>
        <ui.Icon className="h-8 w-8" aria-hidden />
      </div>
      <h1 className="mt-5 text-2xl font-extrabold text-navy">{ui.title}</h1>
      {payment && <p className="mt-1 text-sm text-muted">Order {payment.order_id} · {formatINR(payment.amount_paise)}</p>}
      <p className="mt-4 text-muted">{payment ? ui.text : "We couldn't find this payment on your account."}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {payment && (
          <Link href={`/dashboard/applications/${payment.application_id}`} className={buttonVariants()}>
            Go to application
          </Link>
        )}
        <Link href="/dashboard/payments" className={buttonVariants({ variant: "outline" })}>
          Payment history
        </Link>
      </div>
    </div>
  );
}
