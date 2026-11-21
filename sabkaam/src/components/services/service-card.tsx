import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Category, Service } from "@/lib/catalogue/types";
import { localizedCategoryName, localizedSummary, localizedTitle } from "@/lib/catalogue/types";
import type { Locale } from "@/lib/i18n/dictionaries";
import { Badge } from "@/components/ui/badge";
import { formatINR, cn } from "@/lib/utils";

export function ServiceCard({
  service,
  category,
  locale,
  demoLabel,
  className,
}: {
  service: Service;
  category?: Category;
  locale: Locale;
  demoLabel: string;
  className?: string;
}) {
  return (
    <Link
      href={`/service/${service.slug}`}
      className={cn(
        "group flex h-full flex-col rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-teal/40 hover:shadow-[var(--shadow-lift)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {category && <Badge variant="navy">{localizedCategoryName(category, locale)}</Badge>}
        {service.verificationStatus !== "verified" && <Badge variant="muted">{demoLabel}</Badge>}
      </div>
      <h3 className="mt-3 text-base leading-snug font-bold text-ink group-hover:text-navy">{localizedTitle(service, locale)}</h3>
      <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-muted">{localizedSummary(service, locale)}</p>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <span className="text-xs font-semibold text-muted">
          {service.feePaise != null ? (
            <>
              {locale === "hi" ? "सहायता" : "Assistance"} <span className="text-ink">{formatINR(service.feePaise)}</span>
            </>
          ) : (
            <span className="text-teal-600">{locale === "hi" ? "मुफ़्त जानकारी" : "Free guide"}</span>
          )}
        </span>
        <ArrowUpRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-teal" aria-hidden />
      </div>
    </Link>
  );
}
