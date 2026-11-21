import Link from "next/link";
import { ArrowRight, CircleCheck, Clock, FolderKanban, Wallet } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { PageTitle } from "@/components/dashboard/page-title";
import { ApplicationList, type AppRow } from "@/components/dashboard/application-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { TERMINAL_STATUSES } from "@/lib/applications";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function DashboardHome({ searchParams }: Props) {
  const sp = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();
  const { locale } = await getI18n();
  const [{ data: profile }, { data: apps }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("applications").select("id, reference, status, fee_paise, created_at, updated_at, services(title, slug)").eq("user_id", user.id).order("updated_at", { ascending: false }),
  ]);
  const rows = (apps ?? []) as unknown as AppRow[];
  const active = rows.filter((a) => !TERMINAL_STATUSES.includes(a.status));
  const stats = [
    { label: "Active requests", value: active.length, icon: FolderKanban },
    { label: "Payment pending", value: rows.filter((a) => a.status === "payment_pending").length, icon: Wallet },
    { label: "Action needed", value: rows.filter((a) => a.status === "documents_required" || a.status === "payment_successful").length, icon: Clock },
    { label: "Completed", value: rows.filter((a) => a.status === "completed").length, icon: CircleCheck },
  ];
  const name = profile?.full_name?.split(" ")[0];

  return (
    <>
      {sp.error === "forbidden" && <Alert tone="danger" className="mb-6">You don&apos;t have access to the admin area.</Alert>}
      <PageTitle title={name ? `Namaste, ${name}` : "Namaste"} subtitle="Track your assistance requests, payments and documents." />
      {!profile?.full_name && (
        <Alert tone="info" className="mb-6" title="Complete your profile">
          Add your name and mobile number so we can help you faster. <Link href="/dashboard/profile" className="font-semibold text-teal underline">Update profile</Link>
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-card)]">
            <s.icon className="h-5 w-5 text-teal" aria-hidden />
            <p className="mt-3 text-2xl font-extrabold text-ink">{s.value}</p>
            <p className="text-xs font-medium text-muted">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-navy">Recent applications</h2>
        {rows.length > 0 && (
          <Link href="/dashboard/applications" className="text-sm font-semibold text-teal">View all</Link>
        )}
      </div>
      {rows.length ? (
        <ApplicationList rows={rows.slice(0, 5)} locale={locale} />
      ) : (
        <EmptyState
          icon={<FolderKanban className="h-5 w-5" />}
          title="No applications yet"
          description="Find a service and request assistance — your requests will appear here."
          action={<Link href="/services?assist=1" className={buttonVariants()}>Explore services <ArrowRight className="h-4 w-4" /></Link>}
        />
      )}
    </>
  );
}
