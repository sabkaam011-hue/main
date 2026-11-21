import { SearchX } from "lucide-react";
import type { Category, Service } from "@/lib/catalogue/types";
import type { Locale } from "@/lib/i18n/dictionaries";
import { ServiceCard } from "./service-card";
import { EmptyState } from "@/components/ui/empty-state";

export function ServiceGrid({
  services,
  categories,
  locale,
  demoLabel,
  emptyTitle = "No services found",
  emptyDescription,
}: {
  services: Service[];
  categories: Category[];
  locale: Locale;
  demoLabel: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (!services.length) return <EmptyState icon={<SearchX className="h-5 w-5" />} title={emptyTitle} description={emptyDescription} />;
  const catMap = new Map(categories.map((c) => [c.slug, c]));
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((s) => (
        <ServiceCard key={s.slug} service={s} category={catMap.get(s.category)} locale={locale} demoLabel={demoLabel} />
      ))}
    </div>
  );
}
