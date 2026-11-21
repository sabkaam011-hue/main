import { Badge } from "@/components/ui/badge";
import { PAYMENT_STATUS_META, STATUS_META, statusLabel, type ApplicationStatus } from "@/lib/applications";

export function StatusBadge({ status, locale = "en" }: { status: ApplicationStatus; locale?: string }) {
  const m = STATUS_META[status];
  return <Badge variant={m?.tone ?? "muted"}>{m ? statusLabel(status, locale) : status}</Badge>;
}

export function PaymentBadge({ status }: { status: string }) {
  const m = PAYMENT_STATUS_META[status] ?? { label: status, tone: "muted" as const };
  return <Badge variant={m.tone}>{m.label}</Badge>;
}
