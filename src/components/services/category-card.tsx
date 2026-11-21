import Link from "next/link";
import type { Category } from "@/lib/catalogue/types";
import { localizedCategoryName } from "@/lib/catalogue/types";
import type { Locale } from "@/lib/i18n/dictionaries";
import { CategoryIcon } from "./category-icon";

const TONES = [
  "bg-teal-50 text-teal-600",
  "bg-accent-50 text-[#b56a00]",
  "bg-navy/[0.06] text-navy",
];

export function CategoryCard({ category, count, locale, index = 0 }: { category: Category; count: number; locale: Locale; index?: number }) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className="group relative flex flex-col rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-teal/40 hover:shadow-[var(--shadow-lift)]"
    >
      <div className={`grid h-11 w-11 place-items-center rounded-xl ${TONES[index % TONES.length]} transition-transform group-hover:scale-105`}>
        <CategoryIcon name={category.icon} className="h-5.5 w-5.5" />
      </div>
      <h3 className="mt-4 font-bold text-ink">{localizedCategoryName(category, locale)}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted">{locale === "hi" && category.descriptionHi ? category.descriptionHi : category.description}</p>
      <p className="mt-3 text-xs font-semibold text-teal-600">
        {count} {locale === "hi" ? "सेवाएँ" : "services"} →
      </p>
    </Link>
  );
}
