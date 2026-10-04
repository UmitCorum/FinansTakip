import type { Category, TransactionType } from "@/types/finance";

// Renkler Türk lirası banknot mürekkeplerinden (20 TL yeşili, 50 TL turuncusu, 100 TL mavisi…)
export const CATEGORIES: Category[] = [
  // Gelir
  { id: "salary", name: "Maaş", type: "income", color: "#3E9A62", icon: "briefcase" },
  { id: "freelance", name: "Serbest Çalışma", type: "income", color: "#3A7DB8", icon: "laptop" },
  { id: "investment", name: "Yatırım", type: "income", color: "#A2569A", icon: "trending-up" },
  { id: "rental-income", name: "Kira Geliri", type: "income", color: "#D9822B", icon: "building" },
  { id: "other-income", name: "Diğer Gelir", type: "income", color: "#7D8C8C", icon: "coins" },

  // Gider
  { id: "groceries", name: "Market", type: "expense", color: "#D9822B", icon: "shopping-cart" },
  { id: "rent", name: "Kira", type: "expense", color: "#3A7DB8", icon: "home" },
  { id: "bills", name: "Faturalar", type: "expense", color: "#C9A227", icon: "receipt" },
  { id: "transport", name: "Ulaşım", type: "expense", color: "#2A9D96", icon: "car" },
  { id: "dining", name: "Yeme-İçme", type: "expense", color: "#C8493E", icon: "utensils" },
  { id: "entertainment", name: "Eğlence", type: "expense", color: "#A2569A", icon: "clapperboard" },
  { id: "health", name: "Sağlık", type: "expense", color: "#3E9A62", icon: "heart-pulse" },
  { id: "shopping", name: "Alışveriş", type: "expense", color: "#8573B3", icon: "shopping-bag" },
  { id: "education", name: "Eğitim", type: "expense", color: "#9A7350", icon: "graduation-cap" },
  { id: "other-expense", name: "Diğer Gider", type: "expense", color: "#7D8C8C", icon: "ellipsis" },
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
  income: "#3E9A62",
  expense: "#C8493E",
} as const;
