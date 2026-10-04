import { format, getDaysInMonth, startOfMonth, subMonths } from "date-fns";
import type { Transaction, TransactionType } from "@/types/finance";

interface Template {
  day: number;
  type: TransactionType;
  category: string;
  amount: number;
  description: string;
}

/**
 * Aylık şablon. `monthsAgo` değerine göre tutarlar hafifçe oynatılır,
 * böylece aylar birbirinin kopyası gibi görünmez.
 */
const MONTHLY: Template[] = [
  { day: 1, type: "income", category: "salary", amount: 45000, description: "Aylık maaş" },
  { day: 2, type: "expense", category: "rent", amount: 16500, description: "Ev kirası" },
  { day: 3, type: "expense", category: "groceries", amount: 1240, description: "Haftalık market" },
  { day: 5, type: "expense", category: "transport", amount: 1300, description: "Akbil yükleme" },
  { day: 7, type: "expense", category: "bills", amount: 1180, description: "Elektrik faturası" },
  { day: 9, type: "expense", category: "dining", amount: 860, description: "Akşam yemeği" },
  {
    day: 10,
    type: "expense",
    category: "groceries",
    amount: 980,
    description: "Market alışverişi",
  },
  { day: 12, type: "expense", category: "bills", amount: 649, description: "İnternet faturası" },
  { day: 14, type: "expense", category: "entertainment", amount: 540, description: "Sinema" },
  { day: 16, type: "expense", category: "groceries", amount: 1415, description: "Haftalık market" },
  { day: 18, type: "expense", category: "shopping", amount: 2350, description: "Giyim" },
  { day: 21, type: "expense", category: "dining", amount: 420, description: "Kahve & tatlı" },
  { day: 23, type: "expense", category: "groceries", amount: 760, description: "Manav" },
  { day: 26, type: "expense", category: "health", amount: 900, description: "Eczane" },
];

/** Ay bazında ek (düzensiz) işlemler: index = monthsAgo */
const EXTRAS: Template[][] = [
  [
    { day: 2, type: "expense", category: "dining", amount: 380, description: "Öğle yemeği" },
    { day: 3, type: "income", category: "freelance", amount: 8500, description: "Logo tasarımı" },
  ],
  [
    { day: 6, type: "income", category: "investment", amount: 2150, description: "Temettü" },
    { day: 15, type: "income", category: "freelance", amount: 12000, description: "Web projesi" },
    { day: 20, type: "expense", category: "education", amount: 1850, description: "Online kurs" },
    {
      day: 25,
      type: "expense",
      category: "entertainment",
      amount: 1200,
      description: "Konser bileti",
    },
  ],
  [
    { day: 8, type: "income", category: "rental-income", amount: 6000, description: "Depo kirası" },
    { day: 13, type: "expense", category: "transport", amount: 2100, description: "Araç bakımı" },
    { day: 19, type: "expense", category: "bills", amount: 820, description: "Doğalgaz faturası" },
    { day: 27, type: "expense", category: "other-expense", amount: 650, description: "Hediye" },
  ],
];

// Deterministik küçük sapma (her yüklemede aynı veri)
function jitter(amount: number, seed: number): number {
  if (amount >= 10000) return amount;
  const factor = 1 + (((seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 0.24;
  return Math.round(amount * factor);
}

/**
 * Bugünden geriye 3 aya yayılmış örnek işlemler üretir.
 * Gelecek tarihli işlemler atlanır.
 */
export function createSeedTransactions(now: Date = new Date()): Transaction[] {
  const today = format(now, "yyyy-MM-dd");
  const result: Transaction[] = [];

  for (let monthsAgo = 0; monthsAgo < 3; monthsAgo++) {
    const monthStart = startOfMonth(subMonths(now, monthsAgo));
    const lastDay = getDaysInMonth(monthStart);
    const templates = [...MONTHLY, ...(EXTRAS[monthsAgo] ?? [])];

    templates.forEach((t, i) => {
      const d = new Date(monthStart);
      d.setDate(Math.min(t.day, lastDay));
      const date = format(d, "yyyy-MM-dd");
      if (date > today) return;

      result.push({
        id: `seed-${monthsAgo}-${i}`,
        type: t.type,
        amount: jitter(t.amount, monthsAgo * 31 + i + 7),
        category: t.category,
        description: t.description,
        date,
        createdAt: `${date}T09:00:00.000Z`,
      });
    });
  }

  return result.sort((a, b) => b.date.localeCompare(a.date));
}
