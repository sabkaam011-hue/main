import {
  Briefcase,
  Building2,
  FileText,
  Gauge,
  GraduationCap,
  HeartPulse,
  IndianRupee,
  Landmark,
  Layers,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  landmark: Landmark,
  "indian-rupee": IndianRupee,
  "graduation-cap": GraduationCap,
  briefcase: Briefcase,
  "file-text": FileText,
  gauge: Gauge,
  "heart-pulse": HeartPulse,
  "building-2": Building2,
  layers: Layers,
};

export const ICON_NAMES = Object.keys(ICONS);

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Layers;
  return <Icon className={className} aria-hidden />;
}
