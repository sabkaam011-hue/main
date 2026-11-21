export type Locale = "en" | "hi";

export type CategorySlug =
  | "government-schemes"
  | "banking-loans"
  | "scholarships"
  | "jobs-exams"
  | "documents"
  | "credit-cibil"
  | "health-housing"
  | "business";

export interface Category {
  slug: CategorySlug | string;
  name: string;
  nameHi: string;
  description: string;
  descriptionHi: string;
  /** lucide icon name, see components/services/category-icon.tsx */
  icon: string;
  keywords: string[];
  sortOrder: number;
}

export type VerificationStatus = "demo" | "unverified" | "verified";
export type ServiceKind = "scheme" | "service" | "scholarship" | "job" | "exam" | "guidance";

export interface ServiceFaq {
  q: string;
  a: string;
}

export interface ImportantDate {
  label: string;
  /** ISO date, or null when "as notified" */
  date: string | null;
  note?: string;
}

export interface Service {
  id?: string;
  slug: string;
  category: string;
  kind: ServiceKind;
  title: string;
  titleHi: string;
  summary: string;
  summaryHi: string;
  overview: string;
  benefits: string[];
  eligibility: string[];
  documents: string[];
  process: string[];
  importantDates: ImportantDate[];
  faqs: ServiceFaq[];
  officialSourceName: string;
  officialUrl: string;
  /** Aliases, synonyms, Hinglish and Hindi keywords used by search. */
  keywords: string[];
  /** Assistance fee in paise. null = information only, no paid assistance. */
  feePaise: number | null;
  assistanceScope: string[];
  verificationStatus: VerificationStatus;
  lastVerifiedAt?: string | null;
  isPopular?: boolean;
  isTrending?: boolean;
  isPublished?: boolean;
  sortOrder?: number;
  updatedAt?: string;
}

export function localizedTitle(s: Pick<Service, "title" | "titleHi">, locale: Locale) {
  return locale === "hi" && s.titleHi ? s.titleHi : s.title;
}

export function localizedSummary(s: Pick<Service, "summary" | "summaryHi">, locale: Locale) {
  return locale === "hi" && s.summaryHi ? s.summaryHi : s.summary;
}

export function localizedCategoryName(c: Pick<Category, "name" | "nameHi">, locale: Locale) {
  return locale === "hi" && c.nameHi ? c.nameHi : c.name;
}
