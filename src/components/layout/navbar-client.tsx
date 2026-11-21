"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, LogOut, Menu, ShieldCheck, UserRound, X } from "lucide-react";
import { Logo } from "./logo";
import { LanguageSwitcher } from "./language-switcher";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

interface Props {
  links: { href: string; label: string }[];
  locale: Locale;
  user: { name: string } | null;
  isStaff: boolean;
  labels: { login: string; dashboard: string; admin: string; logout: string; menu: string; language: string };
}

export function NavbarClient({ links, locale, user, isStaff, labels }: Props) {
  const pathname = usePathname();
  // Menu state is tied to the path it was opened on, so navigating closes it without an effect.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const setOpen = (v: boolean | ((o: boolean) => boolean)) => {
    const next = typeof v === "function" ? v(open) : v;
    setOpenFor(next ? pathname : null);
  };
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/85 backdrop-blur-lg no-print">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="ml-4 hidden items-center gap-0.5 xl:flex" aria-label="Main">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={cn(
                "rounded-lg px-2 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                l.href === "/" && "hidden 2xl:block",
                isActive(l.href) ? "text-teal" : "text-ink/80 hover:bg-canvas hover:text-ink",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 xl:flex">
          <LanguageSwitcher locale={locale} label={labels.language} compact />
          {user ? (
            <>
              {isStaff && (
                <Link href="/admin" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  <ShieldCheck className="h-4 w-4" /> {labels.admin}
                </Link>
              )}
              <Link href="/dashboard" className={buttonVariants({ variant: "navy", size: "sm" })}>
                <LayoutDashboard className="h-4 w-4" /> {labels.dashboard}
              </Link>
            </>
          ) : (
            <Link href="/login" className={buttonVariants({ size: "sm" })}>
              <UserRound className="h-4 w-4" /> {labels.login}
            </Link>
          )}
        </div>
        <button
          type="button"
          className="ml-auto grid h-10 w-10 cursor-pointer place-items-center rounded-xl border border-line bg-white xl:hidden"
          aria-label={labels.menu}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
    </header>

      {/* Rendered outside <header>: its backdrop-filter would otherwise become the containing block for this fixed panel. */}
      {open && (
        <div id="mobile-menu" className="no-print fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-line bg-white xl:hidden animate-fade-in">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6" aria-label="Mobile">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={cn(
                  "rounded-xl px-4 py-3 text-base font-semibold",
                  isActive(l.href) ? "bg-teal-50 text-teal-600" : "text-ink hover:bg-canvas",
                )}
              >
                {l.label}
              </Link>
            ))}
            <div className="my-3 h-px bg-line" />
            <LanguageSwitcher locale={locale} label={labels.language} className="self-start" />
            <div className="mt-4 flex flex-col gap-2">
              {user ? (
                <>
                  <Link href="/dashboard" className={buttonVariants({ variant: "navy", size: "lg" })}>
                    <LayoutDashboard className="h-4 w-4" /> {labels.dashboard}
                  </Link>
                  {isStaff && (
                    <Link href="/admin" className={buttonVariants({ variant: "outline", size: "lg" })}>
                      <ShieldCheck className="h-4 w-4" /> {labels.admin}
                    </Link>
                  )}
                  <form action="/auth/signout" method="post">
                    <button className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "w-full")}>
                      <LogOut className="h-4 w-4" /> {labels.logout}
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/login" className={buttonVariants({ size: "lg" })}>
                  <UserRound className="h-4 w-4" /> {labels.login}
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
