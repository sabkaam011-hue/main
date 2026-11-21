import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-9 w-9", className)} aria-hidden>
      <rect width="40" height="40" rx="11" fill="#142D4E" />
      <path d="M12.5 25.5c1.6 1.9 4.4 3 7.6 3 4.3 0 7.4-2.1 7.4-5.6 0-3.1-2.3-4.4-6.6-5.3l-1.9-.4c-2-.4-2.8-.9-2.8-1.9 0-1.1 1.2-1.9 3.1-1.9 1.9 0 3.4.7 4.4 1.9" fill="none" stroke="#13A89E" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="29" cy="11" r="3" fill="#FFB85C" />
    </svg>
  );
}

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)} aria-label="Sabkaam home">
      <LogoMark className={light ? "rounded-[11px] ring-1 ring-white/25" : undefined} />
      <span className={cn("text-xl font-extrabold tracking-tight", light ? "text-white" : "text-navy")}>
        Sab<span className="text-teal">kaam</span>
      </span>
    </Link>
  );
}
