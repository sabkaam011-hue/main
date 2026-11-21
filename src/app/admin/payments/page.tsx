import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { refundPaymentAction, syncPaymentAction } from "@/actions/admin";
import { ActionForm } from "@/components/admin/action-form";
import { Table, Td } from "@/components/admin/table";
import { PaymentBadge } from "@/components/dashboard/status-badge";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { PAYMENT_STATUS_META } from "@/lib/applications";
import { formatDateTime, formatINR } from "@/lib/utils";

type Props = { searchParams: Promise<{ status?: string; q?: string }> };

export default async function AdminPayments({ searchParams }: Props) {
  const sp = await searchParams;
  const { role } = await requireStaff();
  const supabase = await createClient();
  let q = supabase
    .from("payments")
    .select("id, order_id, cf_payment_id, amount_paise, status, payment_method, failure_reason, paid_at, created_at, refund_id, refund_amount_paise, refund_status, application_id, applications(reference, applicant_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (sp.status && sp.status in PAYMENT_STATUS_META) q = q.eq("status", sp.status);
  if (sp.q) q = q.ilike("order_id", `%${sp.q.replace(/[%,()]/g, "").slice(0, 60)}%`);
  const { data } = await q;
  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold text-navy">Payments & refunds</h1>
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <Input name="q" defaultValue={sp.q} placeholder="Order ID" className="max-w-xs" />
        <Select name="status" defaultValue={sp.status ?? ""} className="max-w-[220px]">
          <option value="">All statuses</option>
          {Object.entries(PAYMENT_STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Button type="submit" variant="navy">Filter</Button>
      </form>
      <Table head={["Order", "Request", "Amount", "Status", "Date", "Actions"]} minWidth={980}>
        {(data ?? []).map((p) => {
          const app = p.applications as unknown as { reference: string; applicant_name: string } | null;
          const refundable = role === "admin" && ["success", "refund_pending"].includes(p.status) && !p.refund_id;
          return (
            <tr key={p.id}>
              <Td><span className="font-mono text-xs">{p.order_id}</span>{p.cf_payment_id && <div className="text-xs text-muted">CF {p.cf_payment_id}</div>}</Td>
              <Td><Link href={`/admin/applications/${p.application_id}`} className="font-semibold text-teal">{app?.reference}</Link><div className="text-xs text-muted">{app?.applicant_name}</div></Td>
              <Td className="font-semibold">{formatINR(p.amount_paise)}{p.refund_amount_paise && <div className="text-xs font-normal text-muted">Refund {formatINR(p.refund_amount_paise)} · {p.refund_status}</div>}</Td>
              <Td><PaymentBadge status={p.status} />{p.failure_reason && <div className="mt-1 text-xs text-danger">{p.failure_reason}</div>}</Td>
              <Td className="text-xs whitespace-nowrap text-muted">{formatDateTime(p.paid_at ?? p.created_at)}</Td>
              <Td className="min-w-[260px]">
                {["created", "pending"].includes(p.status) && (
                  <ActionForm action={syncPaymentAction}>
                    <input type="hidden" name="orderId" value={p.order_id} />
                    <SubmitButton size="sm" variant="outline">Re-check with Cashfree</SubmitButton>
                  </ActionForm>
                )}
                {refundable && (
                  <details>
                    <summary className="cursor-pointer text-sm font-semibold text-danger">Refund…</summary>
                    <ActionForm action={refundPaymentAction} className="mt-2" confirm="Initiate this refund with Cashfree? This cannot be undone.">
                      <input type="hidden" name="paymentId" value={p.id} />
                      <Input name="amount" inputMode="decimal" placeholder={`Amount ₹ (blank = full ${(p.amount_paise / 100).toFixed(2)})`} />
                      <Input name="note" placeholder="Reason (required)" required maxLength={100} />
                      <SubmitButton size="sm" variant="danger">Initiate refund</SubmitButton>
                    </ActionForm>
                  </details>
                )}
              </Td>
            </tr>
          );
        })}
        {!data?.length && <tr><Td colSpan={6} className="py-10 text-center text-muted">No payments.</Td></tr>}
      </Table>
    </>
  );
}
