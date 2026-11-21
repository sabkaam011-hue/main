import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/layout/logo";
import { PrintButton } from "@/components/dashboard/print-button";
import { formatDateTime, formatINR } from "@/lib/utils";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/payments/${id}/receipt`);
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("payments")
    .select("*, applications(reference, applicant_name, applicant_phone, services(title))")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!p || !["success", "refunded", "partially_refunded", "refund_pending"].includes(p.status)) notFound();
  const app = p.applications as { reference: string; applicant_name: string; applicant_phone: string; services: { title: string } | null };
  const rows: [string, string][] = [
    ["Receipt for", app.applicant_name],
    ["Mobile", app.applicant_phone],
    ["Service", `${app.services?.title} — application assistance`],
    ["Request reference", app.reference],
    ["Order ID", p.order_id],
    ["Gateway payment ID", p.cf_payment_id ?? "—"],
    ["Payment method", p.payment_method ?? "—"],
    ["Paid on", formatDateTime(p.paid_at)],
    ["Status", p.status.replace("_", " ")],
  ];
  if (p.refund_amount_paise) rows.push(["Refund", `${formatINR(p.refund_amount_paise)} (${p.refund_status})`]);
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-line bg-white p-8 shadow-[var(--shadow-card)] print:border-0 print:shadow-none">
        <div className="flex items-start justify-between">
          <Logo />
          <div className="text-right">
            <p className="text-xs font-semibold text-muted uppercase">Payment receipt</p>
            <p className="text-sm font-semibold">{p.order_id}</p>
          </div>
        </div>
        <dl className="mt-8 divide-y divide-line text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2.5">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right font-medium capitalize-first">{v}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 py-4 text-base">
            <dt className="font-bold">Amount paid</dt>
            <dd className="font-extrabold">{formatINR(p.amount_paise)}</dd>
          </div>
        </dl>
        <p className="mt-6 text-xs leading-relaxed text-muted">
          This receipt is for Sabkaam&apos;s private assistance service fee. It is not a receipt for any government fee and does not
          indicate approval of any application. Sabkaam is not affiliated with any government body. Add your registered business
          name, address and GSTIN here before going live.
        </p>
      </div>
      <div className="mt-4 flex justify-end no-print">
        <PrintButton />
      </div>
    </div>
  );
}
