import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Stat } from "@/components/admin/stat";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/applications";
import { isCashfreeConfigured } from "@/lib/payments/cashfree";
import { formatDateTime, formatINR } from "@/lib/utils";

/** Last-30-days window (UTC day keys). Kept outside the component: reading the clock is a side effect. */
function timeWindow() {
  const now = Date.now();
  const dayKeys = Array.from({ length: 30 }, (_, i) => new Date(now - (29 - i) * 86400_000).toISOString().slice(0, 10));
  return { since: new Date(now - 30 * 86400_000).toISOString(), dayKeys };
}

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  await requireStaff();
  const { since, dayKeys } = timeWindow();
  const db = createAdminClient();
  const [users, apps, pays, open] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("applications").select("status, created_at, services(title)").order("created_at", { ascending: false }).limit(5000),
    db.from("payments").select("amount_paise, status, paid_at, refund_amount_paise").in("status", ["success", "refunded", "partially_refunded", "refund_pending"]).limit(10000),
    db.from("applications").select("id, reference, status, created_at, services(title)").in("status", ["payment_successful", "documents_required", "under_review"]).order("updated_at").limit(8),
  ]);

  const appRows = (apps.data ?? []) as unknown as { status: ApplicationStatus; created_at: string; services: { title: string } | null }[];
  const byStatus = new Map<ApplicationStatus, number>();
  const byService = new Map<string, number>();
  for (const a of appRows) {
    byStatus.set(a.status, (byStatus.get(a.status) ?? 0) + 1);
    const t = a.services?.title ?? "—";
    byService.set(t, (byService.get(t) ?? 0) + 1);
  }
  const payRows = pays.data ?? [];
  const gross = payRows.reduce((s, p) => s + p.amount_paise, 0);
  const refunded = payRows.reduce((s, p) => s + (p.status === "refunded" || p.status === "partially_refunded" ? (p.refund_amount_paise ?? 0) : 0), 0);
  const last30 = payRows.filter((p) => p.paid_at && p.paid_at >= since).reduce((s, p) => s + p.amount_paise, 0);

  const days = dayKeys.map((d) => ({ date: d, paise: payRows.filter((p) => p.paid_at?.slice(0, 10) === d).reduce((s, p) => s + p.amount_paise, 0) }));
  const topServices = [...byService.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold text-navy">Overview</h1>
      {sp.error === "admin_only" && <Alert tone="danger" className="mb-4">That section is available to administrators only.</Alert>}
      {!isCashfreeConfigured() && (
        <Alert tone="warn" className="mb-4" title="Payments not configured">
          Cashfree credentials are missing, so users can&apos;t pay yet. See docs/CASHFREE.md.
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Registered users" value={users.count ?? 0} />
        <Stat label="Assistance requests" value={appRows.length} hint={`${appRows.filter((a) => a.created_at >= since).length} in last 30 days`} />
        <Stat label="Revenue (30 days)" value={formatINR(last30)} />
        <Stat label="Gross revenue" value={formatINR(gross)} hint={`Refunded ${formatINR(refunded)} · Net ${formatINR(gross - refunded)}`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Daily revenue — last 30 days</CardTitle></CardHeader>
          <CardContent><RevenueChart days={days} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Requests by status</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {APPLICATION_STATUSES.map((s) => (
                <li key={s} className="flex items-center justify-between">
                  <StatusBadge status={s} />
                  <Link href={`/admin/applications?status=${s}`} className="font-semibold tabular-nums hover:text-teal">{byStatus.get(s) ?? 0}</Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Needs attention</CardTitle></CardHeader>
          <CardContent>
            {open.data?.length ? (
              <ul className="divide-y divide-line text-sm">
                {(open.data as unknown as { id: string; reference: string; status: ApplicationStatus; created_at: string; services: { title: string } | null }[]).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/admin/applications/${a.id}`} className="min-w-0 hover:text-teal">
                      <span className="font-semibold">{a.reference}</span> <span className="text-muted">· {a.services?.title}</span>
                      <span className="block text-xs text-muted">{formatDateTime(a.created_at)}</span>
                    </Link>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">Nothing waiting. 🎉</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Most requested services</CardTitle></CardHeader>
          <CardContent>
            {topServices.length ? (
              <ul className="space-y-2 text-sm">
                {topServices.map(([t, n]) => (
                  <li key={t} className="flex justify-between gap-3"><span className="truncate">{t}</span><span className="font-semibold tabular-nums">{n}</span></li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">No requests yet.</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
