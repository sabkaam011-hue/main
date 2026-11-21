import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, FileText, Receipt } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { STATUS_META, UPLOAD_ALLOWED_STATUSES, USER_CANCELLABLE_STATUSES, type ApplicationStatus } from "@/lib/applications";
import { StatusBadge, PaymentBadge } from "@/components/dashboard/status-badge";
import { Timeline } from "@/components/dashboard/timeline";
import { PayButton } from "@/components/dashboard/pay-button";
import { DocumentUploader } from "@/components/dashboard/document-uploader";
import { CancelApplicationButton, DeleteDocumentButton } from "@/components/dashboard/action-buttons";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime, formatINR } from "@/lib/utils";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string; existing?: string }> };

export default async function ApplicationDetail({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/dashboard/applications/${id}`);
  const supabase = await createClient();
  const { locale } = await getI18n();

  const { data: app } = await supabase
    .from("applications")
    .select("*, services(title, slug, documents, official_url, official_source_name)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!app) notFound();

  const [{ data: history }, { data: docs }, { data: payments }] = await Promise.all([
    supabase.from("application_status_history").select("id, status, note, created_at").eq("application_id", id).order("created_at"),
    supabase.from("documents").select("id, file_name, label, size_bytes, created_at").eq("application_id", id).order("created_at", { ascending: false }),
    supabase.from("payments").select("id, order_id, amount_paise, status, created_at, paid_at, failure_reason").eq("application_id", id).order("created_at", { ascending: false }),
  ]);

  const status = app.status as ApplicationStatus;
  const meta = STATUS_META[status];
  const canUpload = UPLOAD_ALLOWED_STATUSES.includes(status);
  const lastFailed = payments?.find((p) => p.status !== "success" && p.failure_reason);
  const svc = app.services as { title: string; slug: string; documents: string[]; official_url: string; official_source_name: string } | null;

  return (
    <>
      <Link href="/dashboard/applications" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-teal">
        <ChevronLeft className="h-4 w-4" /> All applications
      </Link>
      <div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted">Reference {app.reference}</p>
          <h1 className="text-2xl font-extrabold text-navy">{svc?.title}</h1>
          <p className="mt-1 text-sm text-muted">Requested {formatDate(app.created_at, locale)} · Fee {formatINR(app.fee_paise)}</p>
        </div>
        <StatusBadge status={status} locale={locale} />
      </div>

      {sp.new && <Alert tone="success" className="mb-4" title="Request submitted">Your reference number is {app.reference}.</Alert>}
      {sp.existing && <Alert tone="info" className="mb-4">You already have an open request for this service — continue it below.</Alert>}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <Card className="border-teal/30">
            <CardHeader>
              <CardTitle>Next step</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-ink/85">{locale === "hi" ? meta.nextHi : meta.next}</p>
              {status === "payment_pending" && (
                <>
                  {lastFailed && <Alert tone="warn">Your last payment attempt did not complete ({lastFailed.failure_reason}). You can try again.</Alert>}
                  <PayButton applicationId={app.id} amountPaise={app.fee_paise} />
                </>
              )}
              {USER_CANCELLABLE_STATUSES.includes(status) && <CancelApplicationButton applicationId={app.id} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              {svc?.documents?.length ? (
                <p className="text-sm text-muted">Typically needed: {svc.documents.join(", ")}. Upload only what our team requests.</p>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              {docs?.length ? (
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {docs.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <FileText className="h-4.5 w-4.5 shrink-0 text-teal" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener" className="block truncate font-semibold text-ink hover:text-teal">
                          {d.label || d.file_name}
                        </a>
                        <p className="truncate text-xs text-muted">
                          {d.file_name} · {(d.size_bytes / 1024).toFixed(0)} KB · {formatDate(d.created_at, locale)}
                        </p>
                      </div>
                      {canUpload && <DeleteDocumentButton documentId={d.id} />}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No documents uploaded yet.</p>
              )}
              {canUpload ? (
                <DocumentUploader applicationId={app.id} suggestions={svc?.documents ?? []} />
              ) : (
                status === "payment_pending" && <p className="text-xs text-muted">You can upload documents once payment is confirmed.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status history</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline items={(history ?? []) as never} locale={locale} />
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {payments?.length ? (
                <ul className="space-y-3 text-sm">
                  {payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{formatINR(p.amount_paise)}</p>
                        <p className="text-xs text-muted">{formatDateTime(p.paid_at ?? p.created_at, locale)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <PaymentBadge status={p.status} />
                        {p.status === "success" && (
                          <Link href={`/dashboard/payments/${p.id}/receipt`} aria-label="Receipt" className="text-muted hover:text-teal">
                            <Receipt className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No payments yet.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Your details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>{app.applicant_name}</p>
              <p className="text-muted">{app.applicant_phone}</p>
              {app.applicant_state && <p className="text-muted">{app.applicant_state}</p>}
            </CardContent>
          </Card>
          {svc?.official_url && (
            <a href={svc.official_url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-white p-4 text-sm font-semibold text-navy hover:border-teal">
              {svc.official_source_name || "Official website"} <ExternalLink className="h-4 w-4 text-teal" />
            </a>
          )}
        </aside>
      </div>
    </>
  );
}
