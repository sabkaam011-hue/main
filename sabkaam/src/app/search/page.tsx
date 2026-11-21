import type { Metadata } from "next";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { getCatalogue, getTrendingSearches } from "@/lib/data/catalogue";
import { search } from "@/lib/search/engine";
import { getI18n } from "@/lib/i18n/server";
import { PageHeader } from "@/components/services/page-header";
import { ServiceGrid } from "@/components/services/service-grid";
import { UniversalSearch } from "@/components/search/universal-search";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const query = q.slice(0, 120);
  const [{ locale, t }, { index, categories }, trending] = await Promise.all([getI18n(), getCatalogue(), getTrendingSearches()]);
  const res = query ? search(index, query, { limit: 30 }) : null;

  return (
    <>
      <PageHeader title={query ? `${t.search.resultsFor} “${query}”` : t.search.label}>
        <div className="max-w-2xl">
          <UniversalSearch key={query} trending={trending} variant="compact" defaultValue={query} />
        </div>
      </PageHeader>
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6">
        {res && res.results.length > 0 && (
          <div>
            <p className="mb-5 text-sm text-muted">
              {res.results.length} {t.common.servicesCount}
            </p>
            <ServiceGrid services={res.results.map((r) => r.service)} categories={categories} locale={locale} demoLabel={t.service.demoBadge} />
          </div>
        )}

        {res && res.results.length === 0 && (
          <div className="rounded-2xl border border-line bg-white p-6 text-center">
            <p className="text-lg font-bold text-ink">
              {t.search.noResults} “{query}”
            </p>
            {res.didYouMean && (
              <p className="mt-2 text-muted">
                {t.search.tryInstead}{" "}
                <Link className="font-semibold text-teal hover:underline" href={`/search?q=${encodeURIComponent(res.didYouMean)}`}>
                  {res.didYouMean}
                </Link>
                ?
              </p>
            )}
          </div>
        )}

        {res && res.related.length > 0 && (
          <div>
            <h2 className="mb-4 text-xl font-bold text-navy">{t.search.related}</h2>
            <ServiceGrid services={res.related} categories={categories} locale={locale} demoLabel={t.service.demoBadge} />
          </div>
        )}

        {!query && (
          <div className="flex flex-wrap gap-2">
            {trending.map((tr) => (
              <Link key={tr.query} href={`/search?q=${encodeURIComponent(tr.query)}`} className="rounded-full border border-line bg-white px-3.5 py-1.5 text-sm hover:border-teal hover:text-teal">
                {locale === "hi" ? tr.labelHi : tr.label}
              </Link>
            ))}
          </div>
        )}

        <div className="flex flex-col items-start gap-4 rounded-2xl border border-accent/40 bg-accent-50 p-6 sm:flex-row sm:items-center">
          <LifeBuoy className="h-8 w-8 text-[#b56a00]" aria-hidden />
          <div className="flex-1">
            <p className="font-bold text-ink">{t.search.needHelp}</p>
            <p className="text-sm text-muted">{locale === "hi" ? "हमें बताइए आप क्या ढूँढ रहे हैं — हमारी टीम मदद करेगी।" : "Tell us what you're looking for and our team will point you in the right direction."}</p>
          </div>
          <Link href={`/help?topic=${encodeURIComponent(query)}#contact`} className={buttonVariants({ variant: "navy" })}>
            {t.search.needHelpCta}
          </Link>
        </div>
      </div>
    </>
  );
}
