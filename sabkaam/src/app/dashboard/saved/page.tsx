import Link from "next/link";
import { Bookmark } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { getCatalogue } from "@/lib/data/catalogue";
import { PageTitle } from "@/components/dashboard/page-title";
import { ServiceGrid } from "@/components/services/service-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";

export default async function SavedPage() {
  const user = await requireUser("/dashboard/saved");
  const supabase = await createClient();
  const [{ locale, t }, { services, categories }, { data }] = await Promise.all([
    getI18n(),
    getCatalogue(),
    supabase.from("saved_services").select("service_id").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);
  const ids = new Set((data ?? []).map((r) => r.service_id));
  const saved = services.filter((s) => s.id && ids.has(s.id));
  return (
    <>
      <PageTitle title="Saved services" subtitle="Services you bookmarked for later." />
      {saved.length ? (
        <ServiceGrid services={saved} categories={categories} locale={locale} demoLabel={t.service.demoBadge} />
      ) : (
        <EmptyState icon={<Bookmark className="h-5 w-5" />} title="Nothing saved yet" description="Tap “Save” on any service page to keep it here." action={<Link href="/services" className={buttonVariants()}>Explore services</Link>} />
      )}
    </>
  );
}
