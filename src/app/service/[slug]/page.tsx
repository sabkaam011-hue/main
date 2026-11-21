import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, ChevronRight, ExternalLink, FileCheck2, HandHelping, Info, ListChecks, ShieldCheck, Sparkles } from "lucide-react";
import { getCategory, getRelatedServices, getServiceBySlug } from "@/lib/data/catalogue";
import { getI18n } from "@/lib/i18n/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { localizedCategoryName, localizedSummary, localizedTitle } from "@/lib/catalogue/types";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { FaqList } from "@/components/home/faq-list";
import { ServiceCard } from "@/components/services/service-card";
import { SaveButton } from "@/components/services/save-button";
import { formatDate, formatINR, siteUrl, cn } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) return { title: "Service not found" };
  const title = `${service.title} — eligibility, documents & how to apply`;
  return {
    title,
    description: `${service.summary} Check eligibility, required documents and the official application link. Sabkaam is a private assistance platform.`,
    alternates: { canonical: `/service/${service.slug}` },
    openGraph: { title, description: service.summary, url: `/service/${service.slug}`, type: "article" },
  };
}

function SectionBlock({ id, icon: Icon, title, children }: { id: string; icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
      <h2 id={`${id}-h`} className="flex items-center gap-2.5 text-lg font-bold text-navy">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-50 text-teal">
          <Icon className="h-4.5 w-4.5" aria-hidden />
        </span>
        {title}
      </h2>
      <div className="mt-4 text-[15px] leading-relaxed text-ink/85">{children}</div>
    </section>
  );
}

function Bullets({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p className="text-muted">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((b) => (
        <li key={b} className="flex gap-2.5">
          <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-teal" aria-hidden />
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const [{ locale, t }, category, related, user] = await Promise.all([
    getI18n(),
    getCategory(service.category),
    getRelatedServices(service, 3),
    getUser(),
  ]);

  let saved = false;
  if (user && service.id) {
    const supabase = await createClient();
    const { data } = await supabase.from("saved_services").select("service_id").eq("user_id", user.id).eq("service_id", service.id).maybeSingle();
    saved = !!data;
  }

  const isDemo = service.verificationStatus !== "verified";
  const hasAssistance = service.feePaise != null;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
        category && { "@type": "ListItem", position: 2, name: category.name, item: `${siteUrl()}/category/${category.slug}` },
        { "@type": "ListItem", position: category ? 3 : 2, name: service.title, item: `${siteUrl()}/service/${service.slug}` },
      ].filter(Boolean),
    },
    service.faqs.length > 0 && {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: service.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    hasAssistance && {
      "@context": "https://schema.org",
      "@type": "Service",
      name: `${service.title} — application assistance`,
      description: service.summary,
      provider: { "@type": "Organization", name: "Sabkaam", url: siteUrl() },
      areaServed: { "@type": "Country", name: "India" },
      offers: { "@type": "Offer", priceCurrency: "INR", price: (service.feePaise! / 100).toFixed(2) },
    },
  ].filter(Boolean);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* Header */}
      <div className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 pt-6 pb-8 sm:px-6">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-muted">
            <Link href="/" className="hover:text-teal">{t.service.home}</Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            {category && (
              <>
                <Link href={`/category/${category.slug}`} className="hover:text-teal">{localizedCategoryName(category, locale)}</Link>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </>
            )}
            <span className="text-ink" aria-current="page">{localizedTitle(service, locale)}</span>
          </nav>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {category && <Badge variant="navy">{localizedCategoryName(category, locale)}</Badge>}
            {isDemo ? <Badge variant="warn">{t.service.demoBadge}</Badge> : <Badge variant="success"><ShieldCheck className="h-3 w-3" /> {t.service.verified}</Badge>}
          </div>
          <h1 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">{localizedTitle(service, locale)}</h1>
          {locale === "hi" && service.titleHi && <p className="mt-1 text-sm text-muted">{service.title}</p>}
          <p className="mt-3 max-w-3xl text-lg text-muted">{localizedSummary(service, locale)}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            {service.officialUrl && (
              <a href={service.officialUrl} target="_blank" rel="noopener noreferrer nofollow" className={buttonVariants({ variant: "navy" })}>
                {t.service.applyOfficial} <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {hasAssistance && (
              <Link href={`/assist/${service.slug}`} className={buttonVariants()}>
                <HandHelping className="h-4 w-4" /> {t.service.getHelp} · {formatINR(service.feePaise)}
              </Link>
            )}
            <SaveButton slug={service.slug} initialSaved={saved} labels={{ save: t.service.save, saved: t.service.saved }} />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          {isDemo && <Alert tone="warn" title={t.service.demoBadge}>{t.service.demoNotice}</Alert>}
          {locale === "hi" && (
            <Alert tone="info">विस्तृत जानकारी अभी अंग्रेज़ी में उपलब्ध है। हिन्दी अनुवाद जल्द आ रहा है।</Alert>
          )}

          <SectionBlock id="overview" icon={Info} title={t.service.overview}>
            <p>{service.overview}</p>
            {service.benefits.length > 0 && (
              <>
                <h3 className="mt-5 mb-3 font-bold text-ink">{t.service.benefits}</h3>
                <Bullets items={service.benefits} empty={t.service.none} />
              </>
            )}
          </SectionBlock>

          <SectionBlock id="eligibility" icon={ListChecks} title={t.service.eligibility}>
            <Bullets items={service.eligibility} empty={t.service.none} />
          </SectionBlock>

          <SectionBlock id="documents" icon={FileCheck2} title={t.service.documents}>
            <Bullets items={service.documents} empty={t.service.none} />
          </SectionBlock>

          <SectionBlock id="process" icon={Sparkles} title={t.service.process}>
            <ol className="space-y-3">
              {service.process.map((p, i) => (
                <li key={p} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-white">{i + 1}</span>
                  <span>{p}</span>
                </li>
              ))}
            </ol>
          </SectionBlock>

          {service.importantDates.length > 0 && (
            <SectionBlock id="dates" icon={CalendarDays} title={t.service.dates}>
              <dl className="divide-y divide-line">
                {service.importantDates.map((d) => (
                  <div key={d.label} className="flex flex-wrap justify-between gap-2 py-2.5">
                    <dt className="font-medium">{d.label}</dt>
                    <dd className="text-muted">
                      {d.date ? formatDate(d.date, locale) : t.service.asNotified}
                      {d.note && <span className="block text-xs">{d.note}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </SectionBlock>
          )}

          <SectionBlock id="official" icon={ShieldCheck} title={t.service.official}>
            <p className="font-semibold">{service.officialSourceName}</p>
            {service.officialUrl && (
              <a href={service.officialUrl} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 inline-flex items-center gap-1.5 break-all text-teal hover:underline">
                {service.officialUrl} <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            )}
            {service.lastVerifiedAt && (
              <p className="mt-2 text-xs text-muted">{t.service.lastVerified}: {formatDate(service.lastVerifiedAt, locale)}</p>
            )}
          </SectionBlock>

          {service.faqs.length > 0 && (
            <section id="faqs" className="scroll-mt-24">
              <h2 className="mb-4 text-lg font-bold text-navy">{t.service.faqs}</h2>
              <FaqList items={service.faqs.map((f) => ({ question: f.q, answer: f.a }))} />
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
            <h2 className="flex items-center gap-2 font-bold text-navy">
              <HandHelping className="h-5 w-5 text-teal" aria-hidden /> {t.service.assistance}
            </h2>
            {hasAssistance ? (
              <>
                <p className="mt-4 text-xs font-semibold tracking-wide text-muted uppercase">{t.service.fee}</p>
                <p className="text-3xl font-extrabold text-ink">{formatINR(service.feePaise)}</p>
                <p className="mt-1 text-xs text-muted">{t.service.feeNote}</p>
                <p className="mt-5 text-sm font-bold text-ink">{t.service.scope}</p>
                <ul className="mt-2 space-y-2 text-sm text-ink/85">
                  {service.assistanceScope.map((s) => (
                    <li key={s} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden /> {s}
                    </li>
                  ))}
                </ul>
                <Link href={`/assist/${service.slug}`} className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full")}>
                  {t.service.getHelp}
                </Link>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted">{t.service.infoOnly}</p>
            )}
          </div>
          <div className="rounded-2xl border border-accent/40 bg-accent-50 p-4 text-xs leading-relaxed text-ink/80">
            <ShieldCheck className="mb-1.5 h-4.5 w-4.5 text-[#b56a00]" aria-hidden />
            {t.service.disclaimer}
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
          <h2 className="mb-4 text-xl font-bold text-navy">{t.service.related}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((s) => (
              <ServiceCard key={s.slug} service={s} category={category ?? undefined} locale={locale} demoLabel={t.service.demoBadge} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
