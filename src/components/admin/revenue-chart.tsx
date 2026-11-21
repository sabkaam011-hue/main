import { formatINR } from "@/lib/utils";

/** Single-series daily revenue bars. Hover shows a native tooltip; a visually-hidden table is the accessible view. */
export function RevenueChart({ days }: { days: { date: string; paise: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.paise));
  return (
    <figure>
      <div className="flex h-44 items-end gap-[2px] border-b border-line" aria-hidden>
        {days.map((d) => (
          <div key={d.date} className="group relative flex h-full flex-1 items-end" title={`${d.date}: ${formatINR(d.paise)}`}>
            <div
              className="w-full rounded-t-[4px] bg-teal transition-opacity group-hover:opacity-80"
              style={{ height: `${d.paise ? Math.max(2, (d.paise / max) * 100) : 0}%` }}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-md bg-navy px-2 py-1 text-[11px] whitespace-nowrap text-white group-hover:block">
              {d.date.slice(5)} · {formatINR(d.paise)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted" aria-hidden>
        <span>{days[0]?.date.slice(5)}</span>
        <span>{days[days.length - 1]?.date.slice(5)}</span>
      </div>
      <table className="sr-only">
        <caption>Successful payment revenue per day</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}><th>{d.date}</th><td>{formatINR(d.paise)}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
