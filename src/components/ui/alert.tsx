import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const styles = {
  info: { box: "border-navy/15 bg-navy/[0.03] text-ink", icon: Info, iconCls: "text-navy" },
  warn: { box: "border-accent/50 bg-accent-50 text-ink", icon: AlertTriangle, iconCls: "text-[#b56a00]" },
  success: { box: "border-success/25 bg-success-50 text-ink", icon: CheckCircle2, iconCls: "text-success" },
  danger: { box: "border-danger/25 bg-danger-50 text-ink", icon: XCircle, iconCls: "text-danger" },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: keyof typeof styles;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const s = styles[tone];
  const Icon = s.icon;
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border p-4 text-sm", s.box, className)}>
      <Icon className={cn("mt-0.5 h-4.5 w-4.5 shrink-0", s.iconCls)} aria-hidden />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-ink/80">{children}</div>}
      </div>
    </div>
  );
}
