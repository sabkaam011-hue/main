import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ChevronLeft, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getServiceBySlug } from "@/lib/data/catalogue";
import { createClient } from "@/lib/supabase/server";
import { AssistForm } from "@/components/forms/assist-form";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";

export const metadata = { title: "Request application assistance", robots: { index: false } };

type Props = { params: Promise<{ slug: string }> };

export default async function AssistPage({ params }: Props) {
  const { slug } = await params;
  const user = await requireUser(`/assist/${slug}`);
  const service = await getServiceBySlug(slug);
  if (!service || service.feePaise == null) notFound();

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("full_name, phone, state").eq("id", user.id).maybeSingle();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href={`/service/${slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-teal">
        <ChevronLeft className="h-4 w-4" /> Back to {service.title}
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold text-navy">Request assistance</h1>
      <p className="mt-1 text-muted">{service.title}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
          {!service.id && (
            <Alert tone="warn" className="mb-6" title="Database not connected">
              Assistance requests need Supabase configured and the catalogue seeded (see docs/SETUP.md).
            </Alert>
          )}
          <AssistForm
            slug={slug}
            eligibility={service.eligibility}
            feePaise={service.feePaise}
            defaults={{ name: profile?.full_name ?? "", phone: (profile?.phone ?? "").replace(/^\+91/, ""), state: profile?.state ?? "" }}
          />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Assistance fee</p>
            <p className="text-3xl font-extrabold text-ink">{formatINR(service.feePaise)}</p>
            {service.verificationStatus !== "verified" && <Badge variant="warn" className="mt-2">Sample fee — demo data</Badge>}
            <p className="mt-2 text-xs text-muted">Sabkaam&apos;s service fee only. Official government fees, if any, are paid separately on the official portal.</p>
            <p className="mt-5 text-sm font-bold">What&apos;s included</p>
            <ul className="mt-2 space-y-2 text-sm">
              {service.assistanceScope.map((s) => (
                <li key={s} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" /> {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5 text-sm">
            <p className="font-bold text-ink">What happens next</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-muted">
              <li>Submit this request</li>
              <li>Pay the fee securely (Cashfree)</li>
              <li>Upload the documents we ask for</li>
              <li>Our team reviews and helps you apply</li>
              <li>Track every update in your dashboard</li>
            </ol>
          </div>
          <p className="flex gap-2 text-xs text-muted">
            <ShieldCheck className="h-4 w-4 shrink-0 text-teal" /> We never guarantee government approval.
          </p>
        </aside>
      </div>
    </div>
  );
}
