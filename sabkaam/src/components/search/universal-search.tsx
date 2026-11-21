"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Loader2, LifeBuoy, Search, Sparkles, TrendingUp, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import type { SearchApiResponse, SearchItem } from "@/app/api/search/route";
import { cn } from "@/lib/utils";

interface Props {
  trending?: { label: string; labelHi: string; query: string }[];
  variant?: "hero" | "compact";
  defaultValue?: string;
  autoFocus?: boolean;
}

export function UniversalSearch({ trending = [], variant = "hero", defaultValue = "", autoFocus }: Props) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState(defaultValue);
  const [data, setData] = useState<SearchApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const title = (i: SearchItem) => (locale === "hi" && i.titleHi ? i.titleHi : i.title);
  const summary = (i: SearchItem) => (locale === "hi" && i.summaryHi ? i.summaryHi : i.summary);
  const cat = (i: SearchItem) => (locale === "hi" && i.categoryNameHi ? i.categoryNameHi : i.categoryName);

  // Debounced live search
  useEffect(() => {
    const query = q.trim();
    if (!query) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=7`, { signal: ctrl.signal });
        if (res.ok) {
          setData(await res.json());
          setActive(-1);
        }
      } catch {
        /* aborted */
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 140);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  // Close on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const hasQuery = q.trim().length > 0;
  const items = hasQuery ? (data?.results ?? []) : [];
  const goToSearchPage = (query = q) => {
    if (!query.trim()) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && items[active]) {
        setOpen(false);
        router.push(`/service/${items[active].slug}`);
      } else goToSearchPage();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const hero = variant === "hero";
  const showPanel = open && (q.trim().length > 0 || trending.length > 0);

  return (
    <div ref={wrapRef} className="relative w-full">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          goToSearchPage();
        }}
        className={cn(
          "flex items-center gap-2 rounded-2xl border bg-white transition-shadow",
          hero ? "border-white/60 p-2 shadow-[var(--shadow-lift)]" : "border-line p-1.5 shadow-[var(--shadow-card)]",
          open && "ring-4 ring-teal/15",
        )}
      >
        <Search className={cn("ml-2.5 shrink-0 text-muted", hero ? "h-5.5 w-5.5" : "h-5 w-5")} aria-hidden />
        <label htmlFor={`${listId}-input`} className="sr-only">
          {t.search.label}
        </label>
        <input
          ref={inputRef}
          id={`${listId}-input`}
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          enterKeyHint="search"
          maxLength={120}
          value={q}
          placeholder={t.search.placeholder}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-ink placeholder:text-muted/80 focus:outline-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden",
            hero ? "h-12 text-base sm:text-lg" : "h-10 text-sm",
          )}
        />
        {loading && hasQuery && <Loader2 className="h-4 w-4 animate-spin text-muted" aria-label={t.search.searching} />}
        {q && !loading && (
          <button
            type="button"
            aria-label={t.search.clear}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-canvas"
            onClick={() => {
              setQ("");
              inputRef.current?.focus();
            }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          className={cn(
            "inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-teal font-semibold text-white transition-colors hover:bg-teal-600",
            hero ? "h-12 px-5 sm:px-6" : "h-10 px-4 text-sm",
          )}
        >
          <span className="hidden sm:inline">{t.search.label.split(" ")[0]}</span>
          <ArrowRight className="h-4 w-4 sm:hidden" aria-hidden />
          <span className="sr-only sm:hidden">{t.search.label}</span>
        </button>
      </form>

      {showPanel && (
        <div
          className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-line bg-white text-left shadow-[var(--shadow-lift)] animate-fade-in"
          aria-live="polite"
        >
          {!q.trim() ? (
            <div className="p-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-bold tracking-wide text-muted uppercase">
                <TrendingUp className="h-3.5 w-3.5" /> {t.search.trending}
              </p>
              <div className="flex flex-wrap gap-2">
                {trending.map((tr) => (
                  <button
                    key={tr.query}
                    type="button"
                    onClick={() => setQ(tr.query)}
                    className="cursor-pointer rounded-full border border-line bg-canvas px-3 py-1.5 text-sm text-ink transition-colors hover:border-teal hover:text-teal"
                  >
                    {locale === "hi" && tr.labelHi ? tr.labelHi : tr.label}
                  </button>
                ))}
              </div>
            </div>
          ) : items.length > 0 ? (
            <>
              <ul id={listId} role="listbox" className="max-h-[60vh] overflow-y-auto py-2">
                {items.map((item, i) => (
                  <li key={item.slug} id={`${listId}-opt-${i}`} role="option" aria-selected={i === active}>
                    <Link
                      href={`/service/${item.slug}`}
                      onClick={() => setOpen(false)}
                      onMouseEnter={() => setActive(i)}
                      className={cn("flex items-start gap-3 px-4 py-3 transition-colors", i === active ? "bg-teal-50/60" : "hover:bg-canvas")}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-ink">{title(item)}</span>
                          <span className="rounded-full bg-navy/[0.06] px-2 py-0.5 text-[11px] font-semibold text-navy">{cat(item)}</span>
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-sm text-muted">{summary(item)}</p>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => goToSearchPage()}
                className="flex w-full cursor-pointer items-center justify-between border-t border-line bg-canvas/60 px-4 py-3 text-sm font-semibold text-teal hover:bg-canvas"
              >
                {t.search.viewAll} “{q.trim()}” <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : loading || !data ? (
            <p className="p-4 text-sm text-muted">{t.search.searching}</p>
          ) : (
            <NoResults
              data={data}
              onSuggest={(s) => setQ(s)}
              title={title}
              cat={cat}
              onNavigate={() => setOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function NoResults({
  data,
  onSuggest,
  title,
  cat,
  onNavigate,
}: {
  data: SearchApiResponse;
  onSuggest: (s: string) => void;
  title: (i: SearchItem) => string;
  cat: (i: SearchItem) => string;
  onNavigate: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="p-4">
      <p className="text-sm text-ink">
        {t.search.noResults} <strong>“{data.query}”</strong>
      </p>
      {data.didYouMean && (
        <p className="mt-1 text-sm text-muted">
          {t.search.tryInstead}{" "}
          <button type="button" className="cursor-pointer font-semibold text-teal underline-offset-2 hover:underline" onClick={() => onSuggest(data.didYouMean!)}>
            {data.didYouMean}
          </button>
          ?
        </p>
      )}
      {data.related.length > 0 && (
        <>
          <p className="mt-4 mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wide text-muted uppercase">
            <Sparkles className="h-3.5 w-3.5" /> {t.search.related}
          </p>
          <ul className="space-y-1">
            {data.related.map((r) => (
              <li key={r.slug}>
                <Link href={`/service/${r.slug}`} onClick={onNavigate} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-canvas">
                  <span className="font-medium text-ink">{title(r)}</span>
                  <span className="text-xs text-muted">{cat(r)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <Link
        href={`/help?topic=${encodeURIComponent(data.query)}#contact`}
        onClick={onNavigate}
        className="mt-4 flex items-center gap-3 rounded-xl border border-accent/50 bg-accent-50 p-3 text-sm"
      >
        <LifeBuoy className="h-5 w-5 shrink-0 text-[#b56a00]" aria-hidden />
        <span>
          <span className="font-semibold text-ink">{t.search.needHelp}</span>{" "}
          <span className="font-semibold text-teal">{t.search.needHelpCta} →</span>
        </span>
      </Link>
    </div>
  );
}
