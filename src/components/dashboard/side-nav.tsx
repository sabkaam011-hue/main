"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Bell, Bookmark, CreditCard, FileStack, FolderKanban, LayoutDashboard, LogOut, Settings, ShieldCheck, Users, Tags, HelpCircle, ReceiptIndianRupee, Layers, Inbox } from "lucide-react";

const ICONS = { LayoutDashboard, FolderKanban, Bookmark, FileStack, CreditCard, Bell, Settings, ShieldCheck, Users, Tags, HelpCircle, ReceiptIndianRupee, Layers, Inbox };
export type NavIcon = keyof typeof ICONS;

export function SideNav({ items, title, showSignOut = true }: { items: { href: string; label: string; icon: NavIcon; badge?: number; exact?: boolean }[]; title: string; showSignOut?: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label={title} className="no-print">
      <p className="mb-2 hidden px-3 text-xs font-bold tracking-wide text-muted uppercase lg:block">{title}</p>
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {items.map((it) => {
          const Icon = ICONS[it.icon];
          const active = it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(`${it.href}/`);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors",
                  active ? "bg-navy text-white" : "text-ink/80 hover:bg-white hover:text-ink",
                )}
              >
                <Icon className="h-4.5 w-4.5" aria-hidden />
                <span className="flex-1">{it.label}</span>
                {!!it.badge && <span className={cn("rounded-full px-1.5 text-[11px]", active ? "bg-white/20" : "bg-accent text-navy")}>{it.badge}</span>}
              </Link>
            </li>
          );
        })}
        {showSignOut && (
          <li className="lg:mt-4 lg:border-t lg:border-line lg:pt-4">
            <form action="/auth/signout" method="post">
              <button className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold whitespace-nowrap text-ink/70 hover:bg-white hover:text-danger">
                <LogOut className="h-4.5 w-4.5" aria-hidden /> Log out
              </button>
            </form>
          </li>
        )}
      </ul>
    </nav>
  );
}
