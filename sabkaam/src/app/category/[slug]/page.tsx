import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalogue, getCategory, getTrendingSearches } from "@/lib/data/catalogue";
import { getI18n } from "@/lib/i18n/server";
import { localizedCategoryName } from "@/lib/catalogue/types";
import { PageHeader } from "@/components/services/page-header";
import { ServiceGrid } from "@/components/services/service-grid";
import { CategoryIcon } from "@/components/services/category-icon";
import { UniversalSearch } from "@/components/search/universal-search";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCategory(slug);
  if (!c) return { title: "Category not found" };
  return { title: c.name, description: c.description, alternates: { canonical: `/category/${c.slug}` } };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();
  const [{ locale, t }, { categories, services }, trending] = await Promise.all([getI18n(), getCatalogue(), getTrendingSearches()]);
  const list = services.filter((s) => s.category === slug);
  return (
    <>
      <PageHeader
        eyebrow={
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-teal-50 text-teal">
            <CategoryIcon name={category.icon} className="h-6 w-6" />
          </span>
        }
        title={localizedCategoryName(category, locale)}
        description={locale === "hi" && category.descriptionHi ? category.descriptionHi : category.description}
      >
        <div className="max-w-2xl">
          <UniversalSearch trending={trending} variant="compact" />
        </div>
      </PageHeader>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <p className="mb-6 text-sm text-muted">
          {list.length} {t.common.servicesCount}
        </p>
        <ServiceGrid services={list} categories={categories} locale={locale} demoLabel={t.service.demoBadge} />
      </div>
    </>
  );
}
