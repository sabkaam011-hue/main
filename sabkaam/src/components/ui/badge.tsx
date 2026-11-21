import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        teal: "bg-teal-50 text-teal-600",
        navy: "bg-navy/8 text-navy",
        accent: "bg-accent-50 text-[#a35f00]",
        muted: "bg-canvas text-muted border border-line",
        success: "bg-success-50 text-success",
        danger: "bg-danger-50 text-danger",
        warn: "bg-warn-50 text-warn",
      },
    },
    defaultVariants: { variant: "teal" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
