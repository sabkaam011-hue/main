"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { setLocaleAction } from "@/actions/locale";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

const SHORT: Record<Locale, string> = { en: "EN", hi: "हिं" };

export function LanguageSwitcher({ locale, label, className, compact }: { locale: Locale; label: string; className?: string; compact?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className={cn("flex items-center gap-1 rounded-xl border border-line bg-white p-1", className)} role="group" aria-label={label}>
      {!compact && <Languages className="ml-1.5 h-4 w-4 text-muted" aria-hidden />}
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          disabled={pending}
          aria-pressed={l === locale}
          onClick={() =>
            start(async () => {
              await setLocaleAction(l);
              router.refresh();
            })
          }
          className={cn(
            "cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
            l === locale ? "bg-navy text-white" : "text-muted hover:text-ink",
          )}
        >
          {compact ? SHORT[l] : LOCALE_LABELS[l]}
          {compact && <span className="sr-only"> {LOCALE_LABELS[l]}</span>}
        </button>
      ))}
    </div>
  );
}
