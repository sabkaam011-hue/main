import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { PageTitle } from "@/components/dashboard/page-title";
import { ApplicationList, type AppRow } from "@/components/dashboard/application-list";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";

export default async function ApplicationsPage() {
  const user = await requireUser("/dashboard/applications");
  const supabase = await createClient();
  const { locale } = await getI18n();
  const { data } = await supabase
    .from("applications")
    .select("id, reference, status, fee_paise, created_at, updated_at, services(title, slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as AppRow[];
  return (
    <>
      <PageTitle title="My applications" subtitle="All your assistance requests and their current status." />
      {rows.length ? (
        <ApplicationList rows={rows} locale={locale} />
      ) : (
        <EmptyState icon={<FolderKanban className="h-5 w-5" />} title="No applications yet" action={<Link href="/services?assist=1" className={buttonVariants()}>Browse services</Link>} />
      )}
    </>
  );
}
