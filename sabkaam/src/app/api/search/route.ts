import { NextResponse, type NextRequest } from "next/server";
import { getCatalogue } from "@/lib/data/catalogue";
import { getSearchProvider } from "@/lib/search/provider";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import type { Service } from "@/lib/catalogue/types";

export interface SearchItem {
  slug: string;
  title: string;
  titleHi: string;
  summary: string;
  summaryHi: string;
  category: string;
  categoryName: string;
  categoryNameHi: string;
  isDemo: boolean;
}

export interface SearchApiResponse {
  query: string;
  results: SearchItem[];
  didYouMean: string | null;
  related: SearchItem[];
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(`search:${clientIp(req.headers)}`, 120, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 120);
  const limit = Math.min(20, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 8));
  const { categories } = await getCatalogue();
  const locale = req.nextUrl.searchParams.get("locale") === "hi" ? "hi" : "en";
  const res = await getSearchProvider().search(q, { limit, locale });
  const catMap = new Map(categories.map((c) => [c.slug, c]));

  const toItem = (s: Service): SearchItem => ({
    slug: s.slug,
    title: s.title,
    titleHi: s.titleHi,
    summary: s.summary,
    summaryHi: s.summaryHi,
    category: s.category,
    categoryName: catMap.get(s.category)?.name ?? s.category,
    categoryNameHi: catMap.get(s.category)?.nameHi ?? "",
    isDemo: s.verificationStatus !== "verified",
  });

  const body: SearchApiResponse = {
    query: q,
    results: res.results.map(toItem),
    didYouMean: res.didYouMean,
    related: res.related.slice(0, 4).map(toItem),
  };
  return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } });
}
