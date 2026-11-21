import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, DICTIONARIES, isLocale, type Locale } from "./dictionaries";

export const LOCALE_COOKIE = "sk_locale";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const v = store.get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: DICTIONARIES[locale] };
}
