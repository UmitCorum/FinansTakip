import {
  ArrowDownLeft,
  ArrowUpRight,
  Briefcase,
  Building,
  Car,
  Clapperboard,
  Coins,
  Ellipsis,
  GraduationCap,
  HeartPulse,
  Home,
  Laptop,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Yalnızca kullanılan ikonlar içe aktarılır (tree-shaking için)
const ICONS: Record<string, LucideIcon> = {
  "arrow-down-left": ArrowDownLeft,
  "arrow-up-right": ArrowUpRight,
  briefcase: Briefcase,
  building: Building,
  car: Car,
  clapperboard: Clapperboard,
  coins: Coins,
  ellipsis: Ellipsis,
  "graduation-cap": GraduationCap,
  "heart-pulse": HeartPulse,
  home: Home,
  laptop: Laptop,
  receipt: Receipt,
  "shopping-bag": ShoppingBag,
  "shopping-cart": ShoppingCart,
  "trending-up": TrendingUp,
  utensils: Utensils,
};

interface CategoryIconProps {
  icon: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: { box: "h-7 w-7 rounded-lg", icon: "h-3.5 w-3.5" },
  md: { box: "h-9 w-9 rounded-xl", icon: "h-4 w-4" },
  lg: { box: "h-11 w-11 rounded-xl", icon: "h-5 w-5" },
};

/** Kategori rengine boyanmış yumuşak zeminli ikon rozeti */
export function CategoryIcon({ icon, color, size = "md", className }: CategoryIconProps) {
  const Icon = ICONS[icon] ?? Ellipsis;
  const s = SIZES[size];
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center", s.box, className)}
      style={{ backgroundColor: `${color}1F`, color, boxShadow: `inset 0 0 0 1px ${color}33` }}
    >
      <Icon className={s.icon} strokeWidth={2.2} />
    </span>
  );
}
