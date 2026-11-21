import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { STATUS_META, type ApplicationStatus } from "@/lib/applications";
import { formatDate, formatINR } from "@/lib/utils";

export interface AppRow {
  id: string;
  reference: string;
  status: ApplicationStatus;
  fee_paise: number;
  created_at: string;
  updated_at: string;
  services: { title: string; slug: string } | null;
}

export function ApplicationList({ rows, locale }: { rows: AppRow[]; locale: string }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-card)]">
      {rows.map((a) => (
        <li key={a.id}>
          <Link href={`/dashboard/applications/${a.id}`} className="flex items-center gap-4 p-4 transition-colors hover:bg-canvas/60 sm:p-5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-ink">{a.services?.title ?? "Service"}</span>
                <StatusBadge status={a.status} locale={locale} />
              </div>
              <p className="mt-1 text-xs text-muted">
                {a.reference} · {formatDate(a.created_at, locale)} · {formatINR(a.fee_paise)}
              </p>
              <p className="mt-1.5 line-clamp-1 text-sm text-ink/75">{locale === "hi" ? STATUS_META[a.status].nextHi : STATUS_META[a.status].next}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
