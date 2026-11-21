import "server-only";
import { CATEGORIES } from "@/lib/catalogue/categories";
import { SEED_SERVICES } from "@/lib/catalogue/services";
import type { Category, Service, ServiceFaq, ImportantDate } from "@/lib/catalogue/types";
import { isServiceRoleConfigured, createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { buildIndex, type SearchIndex } from "@/lib/search/engine";

/**
 * Catalogue repository.
 * - With Supabase configured: reads published categories/services from Postgres.
 * - Without (or if the DB is empty): falls back to the bundled demo catalogue so the
 *   public site and search keep working in local development.
 * Results are cached in-process for CACHE_TTL_MS and invalidated by admin writes.
 */
const CACHE_TTL_MS = 60_000;

interface Snapshot {
  categories: Category[];
  services: Service[];
  index: SearchIndex;
  source: "database" | "seed";
  at: number;
}

let snapshot: Snapshot | null = null;
let inflight: Promise<Snapshot> | null = null;

export function invalidateCatalogue() {
  snapshot = null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapServiceRow(row: any): Service {
  return {
    id: row.id,
    slug: row.slug,
    category: row.categories?.slug ?? row.category_slug ?? "",
    kind: row.kind,
    title: row.title,
    titleHi: row.title_hi ?? "",
    summary: row.summary ?? "",
    summaryHi: row.summary_hi ?? "",
    overview: row.overview ?? "",
    benefits: row.benefits ?? [],
    eligibility: row.eligibility ?? [],
    documents: row.documents ?? [],
    process: row.process ?? [],
    importantDates: (row.important_dates ?? []) as ImportantDate[],
    faqs: (row.faqs ?? []) as ServiceFaq[],
    officialSourceName: row.official_source_name ?? "",
    officialUrl: row.official_url ?? "",
    keywords: (row.service_keywords ?? []).map((k: any) => k.keyword),
    feePaise: row.fee_paise,
    assistanceScope: row.assistance_scope ?? [],
    verificationStatus: row.verification_status,
    lastVerifiedAt: row.last_verified_at,
    isPopular: row.is_popular,
    isTrending: row.is_trending,
    isPublished: row.is_published,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
  };
}

export function mapCategoryRow(row: any): Category {
  return {
    slug: row.slug,
    name: row.name,
    nameHi: row.name_hi ?? "",
    description: row.description ?? "",
    descriptionHi: row.description_hi ?? "",
    icon: row.icon ?? "layers",
    keywords: row.keywords ?? [],
    sortOrder: row.sort_order ?? 0,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const SERVICE_SELECT = "*, categories!inner(slug), service_keywords(keyword)";

async function load(): Promise<Snapshot> {
  if (isSupabaseConfigured() && isServiceRoleConfigured()) {
    try {
      const db = createAdminClient();
      const [cats, svcs] = await Promise.all([
        db.from("categories").select("*").order("sort_order"),
        db.from("services").select(SERVICE_SELECT).eq("is_published", true).order("sort_order"),
      ]);
      if (cats.error) throw cats.error;
      if (svcs.error) throw svcs.error;
      if (cats.data.length && svcs.data.length) {
        const categories = cats.data.map(mapCategoryRow);
        const services = svcs.data.map(mapServiceRow);
        return { categories, services, index: buildIndex(services, categories), source: "database", at: Date.now() };
      }
    } catch (err) {
      console.error("[catalogue] database read failed, falling back to seed data", err);
    }
  }
  const services = SEED_SERVICES.map((s, i) => ({ ...s, sortOrder: i }));
  return { categories: CATEGORIES, services, index: buildIndex(services, CATEGORIES), source: "seed", at: Date.now() };
}

export async function getCatalogue(): Promise<Snapshot> {
  if (snapshot && Date.now() - snapshot.at < CACHE_TTL_MS) return snapshot;
  if (!inflight) {
    inflight = load()
      .then((s) => (snapshot = s))
      .finally(() => (inflight = null));
  }
  return inflight;
}

export async function getCategories() {
  return (await getCatalogue()).categories;
}

export async function getCategory(slug: string) {
  return (await getCatalogue()).categories.find((c) => c.slug === slug) ?? null;
}

export async function getServices(opts: { category?: string; popular?: boolean; limit?: number } = {}) {
  let list = (await getCatalogue()).services;
  if (opts.category) list = list.filter((s) => s.category === opts.category);
  if (opts.popular) list = list.filter((s) => s.isPopular);
  return opts.limit ? list.slice(0, opts.limit) : list;
}

export async function getServiceBySlug(slug: string) {
  return (await getCatalogue()).services.find((s) => s.slug === slug) ?? null;
}

export async function getRelatedServices(service: Service, limit = 3) {
  const all = (await getCatalogue()).services;
  return all.filter((s) => s.category === service.category && s.slug !== service.slug).slice(0, limit);
}

export async function getSearchIndex() {
  return (await getCatalogue()).index;
}

/** Curated short search terms shown as "Popular" / "Trending" chips. */
const TRENDING = [
  { label: "PAN Card", labelHi: "पैन कार्ड", query: "PAN card" },
  { label: "PM Kisan", labelHi: "पीएम किसान", query: "PM Kisan" },
  { label: "Ayushman Card", labelHi: "आयुष्मान कार्ड", query: "Ayushman card" },
  { label: "Scholarship", labelHi: "छात्रवृत्ति", query: "scholarship" },
  { label: "Mudra Loan", labelHi: "मुद्रा लोन", query: "Mudra loan" },
  { label: "Udyam Registration", labelHi: "उद्यम पंजीकरण", query: "Udyam registration" },
  { label: "Voter ID", labelHi: "वोटर आईडी", query: "Voter ID" },
  { label: "Sarkari Naukri", labelHi: "सरकारी नौकरी", query: "sarkari naukri" },
];

export async function getTrendingSearches(): Promise<{ label: string; labelHi: string; query: string }[]> {
  return TRENDING;
}