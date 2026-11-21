import { cn } from "@/lib/utils";

export function Table({ head, children, minWidth = 720 }: { head: string[]; children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-[var(--shadow-card)]">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <thead className="border-b border-line bg-canvas/60 text-xs text-muted uppercase">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-semibold whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-top", className)} {...p} />;
}
