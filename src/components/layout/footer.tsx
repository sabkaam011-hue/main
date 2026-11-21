import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Logo } from "./logo";
import { getI18n } from "@/lib/i18n/server";
import { getCategories } from "@/lib/data/catalogue";
import { localizedCategoryName } from "@/lib/catalogue/types";

export async function Footer() {
  const [{ locale, t }, categories] = await Promise.all([getI18n(), getCategories()]);
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 bg-navy text-white/80 no-print">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo light />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">{t.footer.about}</p>
            <p className="mt-3 text-sm font-semibold text-accent">{t.brand.tagline}</p>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">{t.nav.explore}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link className="hover:text-white" href={`/category/${c.slug}`}>
                    {localizedCategoryName(c, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">{t.footer.company}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link className="hover:text-white" href="/about">About Sabkaam</Link></li>
              <li><Link className="hover:text-white" href="/help">{t.nav.help}</Link></li>
              <li><Link className="hover:text-white" href="/help#contact">Contact us</Link></li>
              <li><Link className="hover:text-white" href="/dashboard">{t.nav.dashboard}</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">{t.footer.legal}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link className="hover:text-white" href="/privacy">{t.footer.privacy}</Link></li>
              <li><Link className="hover:text-white" href="/terms">{t.footer.terms}</Link></li>
              <li><Link className="hover:text-white" href="/refund-policy">{t.footer.refund}</Link></li>
              <li><Link className="hover:text-white" href="/disclaimer">{t.footer.disclaimerLink}</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-relaxed text-white/70">
          <ShieldAlert className="h-5 w-5 shrink-0 text-accent" aria-hidden />
          <p>{t.footer.disclaimer}</p>
        </div>
        <p className="mt-8 text-xs text-white/50">© {year} Sabkaam. {t.footer.rights}</p>
      </div>
    </footer>
  );
}
