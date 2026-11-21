/**
 * Sabkaam local search engine.
 *
 * Pure, dependency-free and deterministic so it can run on the server (API route),
 * in tests, or be swapped for a semantic/vector provider later (see provider.ts).
 *
 * Features: Hindi + English + Hinglish, synonym expansion, typo tolerance
 * (Damerau-Levenshtein), prefix matching for live typing, phrase bonuses,
 * popularity tie-breaks, "did you mean" and related results.
 */
import type { Category, Service } from "@/lib/catalogue/types";
import { STOPWORDS, synonymsOf } from "./synonyms";

export interface IndexedDoc {
  service: Service;
  titleNorm: string;
  titleTokens: Set<string>;
  keywordTokens: Set<string>;
  keywordPhrases: string[];
  categoryTokens: Set<string>;
  summaryTokens: Set<string>;
  allTokens: string[];
}

export interface SearchIndex {
  docs: IndexedDoc[];
  vocabulary: string[];
  categories: Category[];
}

export interface SearchHit {
  service: Service;
  score: number;
}

export interface SearchResponse {
  query: string;
  results: SearchHit[];
  /** Spelling suggestion when the query looked misspelt. */
  didYouMean: string | null;
  /** Shown when there is no confident match. */
  related: Service[];
}

/* ─────────────── normalisation ─────────────── */

export function normalize(input: string): string {
  return input
    .normalize("NFC")
    .toLowerCase()
    .replace(/[​-‍﻿]/g, "") // zero-width chars
    .replace(/़/g, "") // Devanagari nukta (ज़ → ज)
    .replace(/ँ/g, "ं") // chandrabindu → anusvara
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ") // drop punctuation, keep letters/marks/digits
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(input: string): string[] {
  const n = normalize(input);
  return n ? n.split(" ") : [];
}

/* ─────────────── edit distance ─────────────── */

/** Optimal string alignment (Damerau-Levenshtein) distance with early exit. */
export function editDistance(a: string, b: string, max = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const al = a.length;
  const bl = b.length;
  let prevPrev: number[] = new Array(bl + 1).fill(0);
  let prev: number[] = Array.from({ length: bl + 1 }, (_, i) => i);
  for (let i = 1; i <= al; i++) {
    const cur: number[] = new Array(bl + 1);
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prevPrev[j - 2] + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prevPrev = prev;
    prev = cur;
  }
  return prev[bl];
}

function fuzzyThreshold(len: number) {
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  return 2;
}

/* ─────────────── indexing ─────────────── */

export function buildIndex(services: Service[], categories: Category[]): SearchIndex {
  const catMap = new Map(categories.map((c) => [c.slug, c]));
  const vocab = new Set<string>();

  const docs = services
    .filter((s) => s.isPublished !== false)
    .map((service) => {
      const cat = catMap.get(service.category);
      const titleTokens = new Set([...tokenize(service.title), ...tokenize(service.titleHi)]);
      const keywordPhrases = service.keywords.map(normalize).filter(Boolean);
      const keywordTokens = new Set(keywordPhrases.flatMap((k) => k.split(" ")));
      const categoryTokens = new Set(
        cat ? [...tokenize(cat.name), ...tokenize(cat.nameHi), ...cat.keywords.flatMap(tokenize)] : [],
      );
      const summaryTokens = new Set([...tokenize(service.summary), ...tokenize(service.summaryHi)]);
      const allTokens = [...titleTokens, ...keywordTokens];
      for (const t of allTokens) if (t.length > 1 && !STOPWORDS.has(t)) vocab.add(t);
      return {
        service,
        titleNorm: ` ${normalize(service.title)} ${normalize(service.titleHi)} `,
        titleTokens,
        keywordTokens,
        keywordPhrases,
        categoryTokens,
        summaryTokens,
        allTokens,
      } satisfies IndexedDoc;
    });

  return { docs, vocabulary: Array.from(vocab), categories };
}

/* ─────────────── query expansion ─────────────── */

interface Variant {
  term: string;
  weight: number;
  /** allow prefix matching (live typing on the last token) */
  prefix: boolean;
}

function expandToken(token: string, vocabulary: string[], isLast: boolean): Variant[] {
  const variants = new Map<string, Variant>();
  const add = (term: string, weight: number, prefix: boolean) => {
    const existing = variants.get(term);
    if (!existing || existing.weight < weight) variants.set(term, { term, weight, prefix });
  };

  add(token, 1, isLast && token.length >= 2);
  for (const syn of synonymsOf(token)) for (const part of syn.split(" ")) add(part, 0.9, false);

  // Typo tolerance: map to nearby vocabulary terms when not an exact vocabulary word.
  const threshold = fuzzyThreshold(token.length);
  if (threshold > 0 && !vocabulary.includes(token)) {
    for (const v of vocabulary) {
      const d = editDistance(token, v, threshold);
      if (d <= threshold) {
        add(v, d === 1 ? 0.8 : 0.65, false);
        for (const syn of synonymsOf(v)) for (const part of syn.split(" ")) add(part, 0.6, false);
      }
    }
  }
  return Array.from(variants.values());
}

function matchSet(set: Set<string>, v: Variant): "exact" | "prefix" | null {
  if (set.has(v.term)) return "exact";
  if (v.prefix) for (const t of set) if (t.startsWith(v.term)) return "prefix";
  return null;
}

function scoreToken(doc: IndexedDoc, variants: Variant[]): number {
  let best = 0;
  for (const v of variants) {
    const fields: [Set<string>, number, number][] = [
      [doc.titleTokens, 10, 7],
      [doc.keywordTokens, 8, 5],
      [doc.categoryTokens, 3, 2],
      [doc.summaryTokens, 2, 1],
    ];
    for (const [set, exact, prefix] of fields) {
      const m = matchSet(set, v);
      if (m) {
        const sc = (m === "exact" ? exact : prefix) * v.weight;
        if (sc > best) best = sc;
        break; // fields are ordered by importance
      }
    }
  }
  return best;
}

/* ─────────────── search ─────────────── */

export function search(index: SearchIndex, rawQuery: string, opts: { limit?: number } = {}): SearchResponse {
  const limit = opts.limit ?? 10;
  const query = normalize(rawQuery);
  const empty: SearchResponse = { query: rawQuery, results: [], didYouMean: null, related: [] };
  if (!query) return empty;

  let tokens = query.split(" ");
  const meaningful = tokens.filter((t) => !STOPWORDS.has(t));
  if (meaningful.length) tokens = meaningful;

  const expanded = tokens.map((t, i) => expandToken(t, index.vocabulary, i === tokens.length - 1));
  const phrase = tokens.join(" ");

  const hits: SearchHit[] = [];
  for (const doc of index.docs) {
    let total = 0;
    let matched = 0;
    for (const variants of expanded) {
      const sc = scoreToken(doc, variants);
      if (sc > 0) {
        matched++;
        total += sc;
      }
    }
    if (matched === 0) continue;

    const coverage = matched / tokens.length;
    let score = total * coverage * coverage;

    // Phrase bonuses
    // Only the strongest phrase signal counts, so a title mention and an exact alias are comparable.
    let phraseBonus = 0;
    if (doc.titleNorm.includes(` ${phrase} `)) phraseBonus = 15;
    else if (doc.keywordPhrases.includes(phrase)) phraseBonus = 14;
    else if (doc.titleNorm.includes(` ${phrase}`)) phraseBonus = 8;
    else if (phrase.length > 2 && doc.keywordPhrases.some((k) => k.includes(phrase))) phraseBonus = 6;
    score += phraseBonus;

    // Popularity as a gentle tie-breaker
    if (doc.service.isPopular) score += 3;
    if (doc.service.isTrending) score += 1;

    hits.push({ service: doc.service, score });
  }

  // Drop weak partial matches when we have strong ones
  hits.sort((a, b) => b.score - a.score || (a.service.sortOrder ?? 0) - (b.service.sortOrder ?? 0));
  const top = hits[0]?.score ?? 0;
  const results = hits.filter((h) => h.score >= Math.max(2, top * 0.2)).slice(0, limit);

  // Did-you-mean: only when tokens weren't recognised verbatim
  let didYouMean: string | null = null;
  const unknown = tokens.filter((t) => !index.vocabulary.includes(t) && synonymsOf(t).length === 0);
  if (unknown.length) {
    const corrected = tokens.map((t) => {
      if (!unknown.includes(t)) return t;
      let best: { term: string; d: number } | null = null;
      for (const v of index.vocabulary) {
        const d = editDistance(t, v, 2);
        if (d <= 2 && (!best || d < best.d)) best = { term: v, d };
      }
      return best?.term ?? t;
    });
    const suggestion = corrected.join(" ");
    if (suggestion !== tokens.join(" ")) didYouMean = suggestion;
  }

  let related: Service[] = [];
  if (results.length < 3) {
    related = relatedFor(index, tokens, new Set(results.map((r) => r.service.slug)));
  }

  return { query: rawQuery, results, didYouMean, related };
}

/** Related services: matching category by keyword, otherwise popular services. */
function relatedFor(index: SearchIndex, tokens: string[], exclude: Set<string>): Service[] {
  const catScores = new Map<string, number>();
  for (const c of index.categories) {
    const words = new Set([...tokenize(c.name), ...c.keywords.flatMap(tokenize)]);
    for (const t of tokens) {
      for (const w of words) {
        if (w === t || (t.length > 3 && editDistance(t, w, 2) <= 2) || (t.length >= 3 && w.startsWith(t))) {
          catScores.set(c.slug, (catScores.get(c.slug) ?? 0) + 1);
        }
      }
    }
  }
  const cats = [...catScores.entries()].sort((a, b) => b[1] - a[1]).map(([slug]) => slug);
  const pool = index.docs.map((d) => d.service).filter((s) => !exclude.has(s.slug));
  const fromCats = pool.filter((s) => cats.includes(s.category)).sort((a, b) => Number(!!b.isPopular) - Number(!!a.isPopular));
  const popular = pool.filter((s) => s.isPopular);
  const out: Service[] = [];
  for (const s of [...fromCats, ...popular]) {
    if (!out.find((o) => o.slug === s.slug)) out.push(s);
    if (out.length >= 6) break;
  }
  return out;
}
