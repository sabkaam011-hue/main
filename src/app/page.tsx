import Link from "next/link";
import { ArrowRight, BadgeCheck, FileSearch, HandHelping, Languages, Lock, Quote, Search, Activity, ExternalLink, Megaphone } from "lucide-react";
import { UniversalSearch } from "@/components/search/universal-search";
import { Section } from "@/components/home/section";
import { FaqList } from "@/components/home/faq-list";
import { ServiceCard } from "@/components/services/service-card";
import { CategoryCard } from "@/components/services/category-card";
import { buttonVariants } from "@/components/ui/button";
import { getCatalogue, getTrendingSearches } from "@/lib/data/catalogue";
import { getFaqs, getSiteContent } from "@/lib/data/content";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const [{ locale, t }, { categories, services }, trending] = await Promise.all([getI18n(), getCatalogue(), getTrendingSearches()]);
  const [faqs, announcement, heroOverride] = await Promise.all([
    getFaqs(locale),
    getSiteContent("announcement", locale),
    getSiteContent("hero_description", locale),
  ]);
  const catMap = new Map(categories.map((c) => [c.slug, c]));
  const byCat = (slug: string, n = 4) => {
    const list = services.filter((s) => s.category === slug);
    return [...list.filter((s) => s.isPopular), ...list.filter((s) => !s.isPopular)].slice(0, n);
  };
  const counts = new Map<string, number>();
  for (const s of services) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);

  const grids: { id: string; title: string; sub: string; slug: string }[] = [
    { id: "schemes", title: t.sections.schemesTitle, sub: t.sections.schemesSub, slug: "government-schemes" },
    { id: "loans", title: t.sections.loansTitle, sub: t.sections.loansSub, slug: "banking-loans" },
    { id: "scholarships", title: t.sections.scholarshipsTitle, sub: t.sections.scholarshipsSub, slug: "scholarships" },
    { id: "jobs", title: t.sections.jobsTitle, sub: t.sections.jobsSub, slug: "jobs-exams" },
    { id: "documents", title: t.sections.documentsTitle, sub: t.sections.documentsSub, slug: "documents" },
  ];

  const howIcons = [Search, FileSearch, HandHelping, Activity];

  const testimonials = [
    { name: "Sample user, Lucknow", text: "I finally understood which documents I needed for my scholarship. The steps were clear and in Hindi." },
    { name: "Sample user, Indore", text: "The team helped me fill my Udyam registration correctly. I liked that the official portal link was always shown." },
    { name: "Sample user, Patna", text: "Searching 'pan sudhar' found the correction page straight away. Simple and quick." },
  ];

  return (
    <>
      {announcement && (
        <div className="bg-accent-50 text-sm text-ink">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 sm:px-6">
            <Megaphone className="h-4 w-4 shrink-0 text-[#b56a00]" aria-hidden />
            <p>{announcement}</p>
          </div>
        </div>
      )}

      {/* A. HERO */}
      <section className="relative isolate overflow-visible bg-navy">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-teal/25 blur-3xl" />
          <div className="absolute -bottom-48 -left-24 h-[26rem] w-[26rem] rounded-full bg-accent/15 blur-3xl" />
          <svg className="absolute inset-0 h-full w-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M32 0H0v32" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="mx-auto max-w-4xl px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-24 sm:pb-28">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white/85">
            <BadgeCheck className="h-3.5 w-3.5 text-teal" aria-hidden /> {t.hero.eyebrow}
          </p>
          <h1 className="mt-6 text-4xl leading-[1.1] font-extrabold tracking-tight text-white sm:text-6xl">
            {locale === "hi" ? (
              t.hero.title
            ) : (
              <>
                Har zaroori kaam, <span className="text-teal">ek jagah.</span>
              </>
            )}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">{heroOverride || t.hero.description}</p>

          <div className="mx-auto mt-9 max-w-2xl">
            <UniversalSearch trending={trending} variant="hero" />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-semibold text-white/60">{t.search.popular}:</span>
            {trending.slice(0, 6).map((tr) => (
              <Link
                key={tr.query}
                href={`/search?q=${encodeURIComponent(tr.query)}`}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/85 transition-colors hover:border-teal hover:bg-teal/20 hover:text-white"
              >
                {locale === "hi" && tr.labelHi ? tr.labelHi : tr.label}
              </Link>
            ))}
          </div>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/services" className={buttonVariants({ variant: "accent", size: "lg" })}>
              {t.hero.cta} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#how" className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "text-white hover:bg-white/10")}>
              {t.hero.secondary}
            </Link>
          </div>

          <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-white/65">
            <li className="flex items-center gap-1.5"><ExternalLink className="h-3.5 w-3.5 text-teal" /> {t.hero.trust1}</li>
            <li className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-teal" /> {t.hero.trust2}</li>
            <li className="flex items-center gap-1.5"><Languages className="h-3.5 w-3.5 text-teal" /> {t.hero.trust3}</li>
          </ul>
        </div>
      </section>

      {/* B. EXPLORE */}
      <Section id="explore" title={t.sections.exploreTitle} subtitle={t.sections.exploreSub} href="/services" linkLabel={t.sections.viewAll}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c, i) => (
            <CategoryCard key={c.slug} category={c} count={counts.get(c.slug) ?? 0} locale={locale} index={i} />
          ))}
        </div>
      </Section>

      {/* C–G. CATEGORY SHOWCASES */}
      {grids.map((g, i) => {
        const list = byCat(g.slug);
        if (!list.length) return null;
        return (
          <div key={g.id} className={i % 2 === 0 ? "bg-white" : undefined}>
            <Section id={g.id} title={g.title} subtitle={g.sub} href={`/category/${g.slug}`} linkLabel={t.sections.viewAll}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {list.map((s) => (
                  <ServiceCard key={s.slug} service={s} category={catMap.get(s.category)} locale={locale} demoLabel={t.service.demoBadge} />
                ))}
              </div>
            </Section>
          </div>
        );
      })}

      {/* H. HOW IT WORKS */}
      <Section id="how" title={t.sections.howTitle} subtitle={t.sections.howSub}>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.sections.how.map((step, i) => {
            const Icon = howIcons[i];
            return (
              <li key={step.t} className="relative rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
                <span className="absolute top-5 right-5 text-4xl font-extrabold text-navy/[0.06]">0{i + 1}</span>
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-teal text-white">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 font-bold text-ink">{step.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.d}</p>
              </li>
            );
          })}
        </ol>
      </Section>

      {/* I. ASSISTANCE CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy to-navy-700 px-6 py-12 sm:px-12">
          <div aria-hidden className="absolute -right-20 -bottom-24 h-72 w-72 rounded-full bg-teal/30 blur-3xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <h2 className="text-2xl font-extrabold text-white sm:text-3xl">{t.sections.assistTitle}</h2>
              <p className="mt-3 max-w-xl text-white/75">{t.sections.assistSub}</p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link href="/services?assist=1" className={buttonVariants({ variant: "accent", size: "lg" })}>
                {t.sections.assistCta} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* J. TESTIMONIALS (sample) */}
      <Section id="testimonials" title={t.sections.testimonialsTitle} subtitle={t.sections.testimonialsNote}>
        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.map((tm) => (
            <figure key={tm.name} className="relative rounded-2xl border border-dashed border-line bg-white p-6">
              <span className="absolute top-4 right-4 rounded-full bg-canvas px-2 py-0.5 text-[10px] font-bold tracking-wide text-muted uppercase">Sample</span>
              <Quote className="h-6 w-6 text-teal/40" aria-hidden />
              <blockquote className="mt-3 text-sm leading-relaxed text-ink/85">{tm.text}</blockquote>
              <figcaption className="mt-4 text-xs font-semibold text-muted">— {tm.name}</figcaption>
            </figure>
          ))}
        </div>
      </Section>

      {/* K. FAQ */}
      <Section id="faq" title={t.sections.faqTitle} className="max-w-4xl">
        <FaqList items={faqs} />
      </Section>
    </>
  );
}
