import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FileText } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assignApplication, updateApplicationStatus } from "@/actions/admin";
import { ActionForm } from "@/components/admin/action-form";
import { StatusBadge, PaymentBadge } from "@/components/dashboard/status-badge";
import { Timeline } from "@/components/dashboard/timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { STAFF_SETTABLE_STATUSES, STATUS_META, type ApplicationStatus } from "@/lib/applications";
import { formatDateTime, formatINR } from "@/lib/utils";

export default async function AdminApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await requireStaff();
  const supabase = await createClient();
  const { data: app } = await supabase.from("applications").select("*, services(title, slug)").eq("id", id).maybeSingle();
  if (!app) notFound();
  const [{ data: history }, { data: docs }, { data: payments }, { data: staff }] = await Promise.all([
    supabase.from("application_status_history").select("id, status, note, created_at").eq("application_id", id).order("created_at"),
    supabase.from("documents").select("id, file_name, label, size_bytes, mime_type, created_at").eq("application_id", id).order("created_at", { ascending: false }),
    supabase.from("payments").select("id, order_id, amount_paise, status, paid_at, created_at, failure_reason").eq("application_id", id).order("created_at", { ascending: false }),
    supabase.from("admin_users").select("user_id, role"),
  ]);
  const staffUsers = await Promise.all(
    (staff ?? []).map(async (s) => {
      const { data } = await createAdminClient().auth.admin.getUserById(s.user_id);
      return { id: s.user_id, label: `${data.user?.email ?? data.user?.phone ?? s.user_id.slice(0, 8)} (${s.role})` };
    }),
  );
  const svc = app.services as { title: string; slug: string } | null;
  const elig = Object.entries((app.eligibility_answers ?? {}) as Record<string, boolean>);

  return (
    <>
      <Link href="/admin/applications" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-teal"><ChevronLeft className="h-4 w-4" /> All requests</Link>
      <div className="mt-3 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted">{app.reference} · {formatDateTime(app.created_at)}</p>
          <h1 className="text-2xl font-extrabold text-navy">{svc?.title}</h1>
        </div>
        <StatusBadge status={app.status as ApplicationStatus} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader><CardTitle>Applicant</CardTitle></CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
              <div><p className="text-muted">Name</p><p className="font-semibold">{app.applicant_name}</p></div>
              <div><p className="text-muted">Mobile</p><p className="font-semibold">{app.applicant_phone}</p></div>
              <div><p className="text-muted">State</p><p className="font-semibold">{app.applicant_state ?? "—"}</p></div>
              <div><p className="text-muted">Fee</p><p className="font-semibold">{formatINR(app.fee_paise)}</p></div>
              {app.notes && <div className="sm:col-span-2"><p className="text-muted">Notes from user</p><p className="whitespace-pre-wrap">{app.notes}</p></div>}
              {elig.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="mb-1 text-muted">Eligibility self-check</p>
                  <ul className="space-y-1">{elig.map(([k, v]) => <li key={k}>{v ? "✅" : "⬜️"} {k}</li>)}</ul>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Documents ({docs?.length ?? 0})</CardTitle></CardHeader>
            <CardContent>
              {docs?.length ? (
                <ul className="divide-y divide-line rounded-xl border border-line text-sm">
                  {docs.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                      <FileText className="h-4.5 w-4.5 text-teal" />
                      <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener" className="min-w-0 flex-1 truncate font-semibold hover:text-teal">{d.label || d.file_name}</a>
                      <span className="text-xs text-muted">{(d.size_bytes / 1024).toFixed(0)} KB · {formatDateTime(d.created_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted">No documents uploaded.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>History</CardTitle></CardHeader>
            <CardContent><Timeline items={(history ?? []) as never} locale="en" /></CardContent>
          </Card>
        </div>
        <aside className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Update status</CardTitle></CardHeader>
            <CardContent>
              <ActionForm action={updateApplicationStatus}>
                <input type="hidden" name="applicationId" value={app.id} />
                <div>
                  <Label htmlFor="status">New status</Label>
                  <Select id="status" name="status" defaultValue={STAFF_SETTABLE_STATUSES.includes(app.status) ? app.status : "under_review"}>
                    {STAFF_SETTABLE_STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].en}</option>)}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="note">Note to user (shown in their timeline)</Label>
                  <Textarea id="note" name="note" maxLength={2000} placeholder="e.g. Please upload a clearer copy of your address proof." />
                </div>
                <SubmitButton className="w-full" pendingText="Updating…">Update & notify user</SubmitButton>
              </ActionForm>
              <p className="mt-3 text-xs text-muted">Payment statuses are set automatically by the payment gateway and can&apos;t be set manually.</p>
            </CardContent>
          </Card>
          {role === "admin" && (
            <Card>
              <CardHeader><CardTitle>Assign to staff</CardTitle></CardHeader>
              <CardContent>
                <ActionForm action={assignApplication}>
                  <input type="hidden" name="applicationId" value={app.id} />
                  <Select name="staffId" defaultValue={app.assigned_to ?? ""} aria-label="Staff member">
                    <option value="">Unassigned</option>
                    {staffUsers.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </Select>
                  <SubmitButton variant="outline" className="w-full">Save assignment</SubmitButton>
                </ActionForm>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
            <CardContent>
              {payments?.length ? (
                <ul className="space-y-3 text-sm">
                  {payments.map((p) => (
                    <li key={p.id} className="flex items-start justify-between gap-2">
                      <div><p className="font-semibold">{formatINR(p.amount_paise)}</p><p className="text-xs text-muted">{p.order_id}</p>{p.failure_reason && <p className="text-xs text-danger">{p.failure_reason}</p>}</div>
                      <PaymentBadge status={p.status} />
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted">No payments.</p>}
              <Link href="/admin/payments" className="mt-3 inline-block text-xs font-semibold text-teal">Manage payments & refunds →</Link>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
