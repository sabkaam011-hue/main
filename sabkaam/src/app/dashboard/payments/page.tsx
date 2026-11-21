import Link from "next/link";
import { CreditCard, Receipt } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { PageTitle } from "@/components/dashboard/page-title";
import { PaymentBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatINR } from "@/lib/utils";

export default async function PaymentsPage() {
  const user = await requireUser("/dashboard/payments");
  const supabase = await createClient();
  const { locale } = await getI18n();
  const { data } = await supabase
    .from("payments")
    .select("id, order_id, amount_paise, status, created_at, paid_at, refund_amount_paise, refund_status, application_id, applications(reference, services(title))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (
    <>
      <PageTitle title="Payment history" subtitle="All assistance fee payments, verified with our payment gateway." />
      {data?.length ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line bg-canvas/60 text-xs text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Service</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold"><span className="sr-only">Receipt</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((p) => {
                const app = p.applications as unknown as { reference: string; services: { title: string } | null } | null;
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/applications/${p.application_id}`} className="font-semibold hover:text-teal">{app?.services?.title}</Link>
                      <p className="text-xs text-muted">{p.order_id}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(p.paid_at ?? p.created_at, locale)}</td>
                    <td className="px-4 py-3 font-semibold">
                      {formatINR(p.amount_paise)}
                      {p.refund_amount_paise && <p className="text-xs font-normal text-muted">Refund {formatINR(p.refund_amount_paise)} · {p.refund_status}</p>}
                    </td>
                    <td className="px-4 py-3"><PaymentBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-right">
                      {["success", "refunded", "partially_refunded", "refund_pending"].includes(p.status) && (
                        <Link href={`/dashboard/payments/${p.id}/receipt`} className="inline-flex items-center gap-1 text-xs font-semibold text-teal">
                          <Receipt className="h-3.5 w-3.5" /> Receipt
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={<CreditCard className="h-5 w-5" />} title="No payments yet" />
      )}
    </>
  );
}
