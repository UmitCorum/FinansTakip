import type { Category, TransactionType } from "@/types/finance";

export const CATEGORIES: Category[] = [
  // Gelir
  { id: "salary", name: "Maaş", type: "income", color: "#10B981", icon: "briefcase" },
  { id: "freelance", name: "Serbest Çalışma", type: "income", color: "#06B6D4", icon: "laptop" },
  { id: "investment", name: "Yatırım", type: "income", color: "#8B5CF6", icon: "trending-up" },
  { id: "rental-income", name: "Kira Geliri", type: "income", color: "#F59E0B", icon: "building" },
  { id: "other-income", name: "Diğer Gelir", type: "income", color: "#94A3B8", icon: "coins" },

  // Gider
  { id: "groceries", name: "Market", type: "expense", color: "#F97316", icon: "shopping-cart" },
  { id: "rent", name: "Kira", type: "expense", color: "#6366F1", icon: "home" },
  { id: "bills", name: "Faturalar", type: "expense", color: "#FACC15", icon: "receipt" },
  { id: "transport", name: "Ulaşım", type: "expense", color: "#0EA5E9", icon: "car" },
  { id: "dining", name: "Yeme-İçme", type: "expense", color: "#F43F5E", icon: "utensils" },
  { id: "entertainment", name: "Eğlence", type: "expense", color: "#D946EF", icon: "clapperboard" },
  { id: "health", name: "Sağlık", type: "expense", color: "#10B981", icon: "heart-pulse" },
  { id: "shopping", name: "Alışveriş", type: "expense", color: "#A3E635", icon: "shopping-bag" },
  { id: "education", name: "Eğitim", type: "expense", color: "#2DD4BF", icon: "graduation-cap" },
  { id: "other-expense", name: "Diğer Gider", type: "expense", color: "#94A3B8", icon: "ellipsis" },
];

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));

const FALLBACK: Category = {
  id: "unknown",
  name: "Bilinmeyen",
  type: "expense",
  color: "#64748B",
  icon: "ellipsis",
};

export function getCategory(id: string): Category {
  return byId.get(id) ?? { ...FALLBACK, id };
}

export function getCategoriesByType(type: TransactionType): Category[] {
  return CATEGORIES.filter((c) => c.type === type);
}

export const OVERVIEW_COLORS = {
  income: "#22C55E",
  expense: "#F43F5E",
} as const;
