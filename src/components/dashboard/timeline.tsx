import { StatusBadge } from "./status-badge";
import type { ApplicationStatus } from "@/lib/applications";
import { formatDateTime } from "@/lib/utils";

export function Timeline({ items, locale }: { items: { id: number; status: ApplicationStatus; note: string | null; created_at: string }[]; locale: string }) {
  return (
    <ol className="relative space-y-5 border-l-2 border-line pl-6">
      {items.map((h, i) => (
        <li key={h.id} className="relative">
          <span className={`absolute top-1 -left-[31px] h-3.5 w-3.5 rounded-full border-2 border-white ${i === items.length - 1 ? "bg-teal ring-4 ring-teal/20" : "bg-navy/30"}`} aria-hidden />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={h.status} locale={locale} />
            <time className="text-xs text-muted" dateTime={h.created_at}>{formatDateTime(h.created_at, locale)}</time>
          </div>
          {h.note && <p className="mt-1.5 text-sm text-ink/80">{h.note}</p>}
        </li>
      ))}
    </ol>
  );
}
