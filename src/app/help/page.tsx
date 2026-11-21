import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, FileUp, HandHelping, Search, ShieldCheck, UserRound } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getFaqs } from "@/lib/data/content";
import { getTrendingSearches } from "@/lib/data/catalogue";
import { PageHeader } from "@/components/services/page-header";
import { FaqList } from "@/components/home/faq-list";
import { UniversalSearch } from "@/components/search/universal-search";
import { SupportForm } from "@/components/forms/support-form";

export const metadata: Metadata = { title: "Help Centre", description: "Answers to common questions about using Sabkaam, payments, documents and refunds.", alternates: { canonical: "/help" } };

const topics = [
  { icon: Search, t: "Finding a service", d: "Search in Hindi or English — try “pan sudhar”, “scholarship” or “mudra loan”. Every page links to the official portal." },
  { icon: UserRound, t: "Your account", d: "Log in with mobile OTP. Browsing is free and needs no account." },
  { icon: HandHelping, t: "Paid assistance", d: "The fee and what's included are shown before you request. We never guarantee approval." },
  { icon: CreditCard, t: "Payments", d: "Payments are processed by Cashfree and verified on our servers. Receipts are in your dashboard." },
  { icon: FileUp, t: "Documents", d: "Upload PDF/JPG/PNG up to 5 MB after payment. Files are private to you and your assigned staff." },
  { icon: ShieldCheck, t: "Refunds", d: "See our Refund Policy. Refunds go back to the original payment method." },
];

export default async function HelpPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  const [{ locale, t }, faqs, trending] = await Promise.all([getI18n(), getI18n().then((x) => getFaqs(x.locale)), getTrendingSearches()]);
  return (
    <>
      <PageHeader title={t.nav.help} description={locale === "hi" ? "सामान्य प्रश्नों के उत्तर, या सीधे हमारी टीम से संपर्क करें।" : "Answers to common questions, or reach our team directly."}>
        <div className="max-w-2xl"><UniversalSearch trending={trending} variant="compact" /></div>
      </PageHeader>
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((x) => (
            <div key={x.t} className="rounded-2xl border border-line bg-white p-5">
              <x.icon className="h-5 w-5 text-teal" aria-hidden />
              <h2 className="mt-3 font-bold">{x.t}</h2>
              <p className="mt-1 text-sm text-muted">{x.d}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-10 lg:grid-cols-2">
          <section>
            <h2 className="mb-4 text-xl font-bold text-navy">{t.sections.faqTitle}</h2>
            <FaqList items={faqs} />
            <p className="mt-4 text-sm text-muted">See also: <Link className="text-teal underline" href="/refund-policy">Refund Policy</Link> · <Link className="text-teal underline" href="/privacy">Privacy Policy</Link></p>
          </section>
          <section id="contact" className="scroll-mt-24">
            <h2 className="mb-4 text-xl font-bold text-navy">Contact us</h2>
            <div className="rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]"><SupportForm topic={topic} /></div>
          </section>
        </div>
      </div>
    </>
  );
}
