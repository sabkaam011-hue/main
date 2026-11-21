import type { Metadata } from "next";
import Link from "next/link";
import { getCatalogue, getTrendingSearches } from "@/lib/data/catalogue";
import { getI18n } from "@/lib/i18n/server";
import { localizedCategoryName } from "@/lib/catalogue/types";
import { PageHeader } from "@/components/services/page-header";
import { ServiceGrid } from "@/components/services/service-grid";
import { UniversalSearch } from "@/components/search/universal-search";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Explore all services",
  description: "Browse government schemes, loans, scholarships, jobs, documents, credit, health, housing and business services.",
  alternates: { canonical: "/services" },
};

type Props = { searchParams: Promise<{ category?: string; assist?: string }> };

export default async function ServicesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const [{ locale, t }, { categories, services }, trending] = await Promise.all([getI18n(), getCatalogue(), getTrendingSearches()]);
  const assistOnly = sp.assist === "1";
  const active = categories.find((c) => c.slug === sp.category)?.slug;
  let list = services;
  if (active) list = list.filter((s) => s.category === active);
  if (assistOnly) list = list.filter((s) => s.feePaise != null);

  const href = (params: { category?: string; assist?: boolean }) => {
    const q = new URLSearchParams();
    if (params.category) q.set("category", params.category);
    if (params.assist) q.set("assist", "1");
    const s = q.toString();
    return `/services${s ? `?${s}` : ""}`;
  };
  const chip = (on: boolean) =>
    cn(
      "rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
      on ? "border-navy bg-navy text-white" : "border-line bg-white text-ink hover:border-teal hover:text-teal",
    );

  return (
    <>
      <PageHeader title={t.nav.explore} description={t.sections.exploreSub}>
        <div className="max-w-2xl">
          <UniversalSearch trending={trending} variant="compact" />
        </div>
      </PageHeader>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <nav aria-label="Filter by category" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
          <Link href={href({ assist: assistOnly })} className={chip(!active)} aria-current={!active ? "true" : undefined}>
            {locale === "hi" ? "सभी" : "All"}
          </Link>
          {categories.map((c) => (
            <Link key={c.slug} href={href({ category: c.slug, assist: assistOnly })} className={chip(active === c.slug)} aria-current={active === c.slug ? "true" : undefined}>
              {localizedCategoryName(c, locale)}
            </Link>
          ))}
        </nav>
        <div className="mt-4 mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {list.length} {t.common.servicesCount}
          </p>
          <Link href={href({ category: active, assist: !assistOnly })} className={chip(assistOnly)} aria-pressed={assistOnly}>
            {locale === "hi" ? "केवल सहायता उपलब्ध" : "Assistance available only"}
          </Link>
        </div>
        <ServiceGrid services={list} categories={categories} locale={locale} demoLabel={t.service.demoBadge} />
      </div>
    </>
  );
}
