import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Section({
  id,
  title,
  subtitle,
  href,
  linkLabel,
  children,
  className,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16", className)} aria-labelledby={id ? `${id}-title` : undefined}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 id={id ? `${id}-title` : undefined} className="text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">
            {title}
          </h2>
          {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
        </div>
        {href && linkLabel && (
          <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal hover:gap-2.5 transition-all">
            {linkLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
