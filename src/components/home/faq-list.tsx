import { ChevronDown } from "lucide-react";

export function FaqList({ items }: { items: { id?: string; question: string; answer: string }[] }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-card)]">
      {items.map((f, i) => (
        <details key={f.id ?? i} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-ink hover:bg-canvas/60 [&::-webkit-details-marker]:hidden">
            {f.question}
            <ChevronDown className="h-4.5 w-4.5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <p className="px-5 pb-5 text-sm leading-relaxed text-muted">{f.answer}</p>
        </details>
      ))}
    </div>
  );
}
