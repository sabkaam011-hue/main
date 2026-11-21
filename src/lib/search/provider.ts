import "server-only";
import type { Service } from "@/lib/catalogue/types";
import { getCatalogue } from "@/lib/data/catalogue";
import { search as localSearch } from "./engine";

/**
 * Search provider abstraction.
 * The default LocalSearchProvider runs the in-process engine over the catalogue.
 * To add semantic / AI search later, implement SearchProvider (e.g. pgvector embeddings
 * in Supabase, or a hosted vector DB) and blend its results with the local engine's —
 * keeping local results as the fallback so search never goes down.
 */
export interface SearchProviderResult {
  results: Service[];
  didYouMean: string | null;
  related: Service[];
}

export interface SearchProvider {
  name: string;
  search(query: string, opts: { limit: number; locale: "en" | "hi" }): Promise<SearchProviderResult>;
}

export const LocalSearchProvider: SearchProvider = {
  name: "local",
  async search(query, { limit }) {
    const { index } = await getCatalogue();
    const r = localSearch(index, query, { limit });
    return { results: r.results.map((h) => h.service), didYouMean: r.didYouMean, related: r.related };
  },
};

export function getSearchProvider(): SearchProvider {
  // e.g. if (process.env.SEARCH_PROVIDER === "semantic") return SemanticSearchProvider;
  return LocalSearchProvider;
}
