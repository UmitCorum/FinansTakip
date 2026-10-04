import {
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
  subYears,
} from "date-fns";
import { tr } from "date-fns/locale";
import { OVERVIEW_COLORS, getCategory } from "@/data/categories";
import type { Period, Transaction, TransactionType } from "@/types/finance";

export interface Totals {
  income: number;
  expense: number;
  net: number;
  /** (gelir - gider) / gelir; gelir yoksa null */
  savingsRate: number | null;
  count: number;
}

export interface BreakdownItem {
  id: string;
  name: string;
  color: string;
  icon: string;
  amount: number;
  /** 0–1 arası pay */
  share: number;
  count: number;
}

export interface DateRange {
  from: string; // dahil, "yyyy-MM-dd"
  to: string; // dahil
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");

/** Para hesaplarında kayan nokta hatalarını önlemek için kuruş bazında toplar */
function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + Math.round(v * 100), 0) / 100;
}

export function getPeriodRange(period: Period, now: Date): DateRange | null {
  switch (period) {
    case "this-month":
      return { from: iso(startOfMonth(now)), to: iso(endOfMonth(now)) };
    case "last-month": {
      const last = subMonths(now, 1);
      return { from: iso(startOfMonth(last)), to: iso(endOfMonth(last)) };
    }
    case "last-3-months":
      return { from: iso(startOfMonth(subMonths(now, 2))), to: iso(endOfMonth(now)) };
    case "this-year":
      return { from: iso(startOfYear(now)), to: iso(endOfYear(now)) };
    case "all":
      return null;
  }
}

export function filterByPeriod(
  transactions: Transaction[],
  period: Period,
  now: Date = new Date(),
): Transaction[] {
  return filterByRange(transactions, getPeriodRange(period, now));
}

export function filterByRange(transactions: Transaction[], range: DateRange | null): Transaction[] {
  if (!range) return transactions;
  return transactions.filter((t) => t.date >= range.from && t.date <= range.to);
}

/**
 * Karşılaştırma için bir önceki eşdeğer dönem. Devam eden dönemlerde
 * (bu ay / bu yıl) adil kıyas için yalnızca aynı güne kadarki kısım alınır.
 */
export function getPreviousPeriodRange(period: Period, now: Date): DateRange | null {
  switch (period) {
    case "this-month": {
      const prev = subMonths(now, 1);
      return { from: iso(startOfMonth(prev)), to: iso(prev) };
    }
    case "last-month": {
      const m = subMonths(now, 2);
      return { from: iso(startOfMonth(m)), to: iso(endOfMonth(m)) };
    }
    case "last-3-months":
      return {
        from: iso(startOfMonth(subMonths(now, 5))),
        to: iso(endOfMonth(subMonths(now, 3))),
      };
    case "this-year": {
      const prev = subYears(now, 1);
      return { from: iso(startOfYear(prev)), to: iso(prev) };
    }
    case "all":
      return null;
  }
}

/** Göreli değişim; önceki değer 0 ise karşılaştırma yapılamaz (null) */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

export type Granularity = "day" | "week" | "month";

export interface CashflowPoint {
  key: string; // kova başlangıcı, "yyyy-MM-dd"
  label: string;
  income: number;
  expense: number;
}

/**
 * Nakit akışı grafiği için zaman serisi. Aralık uzunluğuna göre
 * günlük / haftalık / aylık kovalara böler. Devam eden dönemlerde
 * bugünden sonrası (ileri tarihli kayıt yoksa) gösterilmez.
 */
export function getCashflowSeries(
  transactions: Transaction[],
  period: Period,
  now: Date = new Date(),
): { granularity: Granularity; points: CashflowPoint[] } {
  const inPeriod = filterByPeriod(transactions, period, now);
  const dates = inPeriod.map((t) => t.date).sort();
  let range = getPeriodRange(period, now);
  if (!range) {
    if (dates.length === 0) return { granularity: "month", points: [] };
    range = { from: dates[0], to: dates[dates.length - 1] };
  }

  const today = iso(now);
  const lastTx = dates[dates.length - 1];
  let to = range.to;
  if (range.from <= today && range.to > today) to = lastTx && lastTx > today ? lastTx : today;

  const start = parseISO(range.from);
  const end = parseISO(to);
  const days = differenceInCalendarDays(end, start) + 1;
  const granularity: Granularity = days <= 31 ? "day" : days <= 124 ? "week" : "month";

  const bucketOf = (d: Date) =>
    granularity === "day"
      ? d
      : granularity === "week"
        ? startOfWeek(d, { weekStartsOn: 1 })
        : startOfMonth(d);

  const starts =
    granularity === "day"
      ? eachDayOfInterval({ start, end })
      : granularity === "week"
        ? eachWeekOfInterval({ start, end }, { weekStartsOn: 1 })
        : eachMonthOfInterval({ start, end });

  const multiYear = start.getFullYear() !== end.getFullYear();
  const labelFormat = granularity === "month" ? (multiYear ? "MMM yy" : "MMM") : "d MMM";

  const cents = new Map(starts.map((s) => [iso(s), { income: 0, expense: 0 }]));
  for (const t of inPeriod) {
    const bucket = cents.get(iso(bucketOf(parseISO(t.date))));
    if (bucket) bucket[t.type] += Math.round(t.amount * 100);
  }

  return {
    granularity,
    points: starts.map((s) => {
      const key = iso(s);
      const c = cents.get(key)!;
      return {
        key,
        label: format(s, labelFormat, { locale: tr }),
        income: c.income / 100,
        expense: c.expense / 100,
      };
    }),
  };
}

export function calculateTotals(transactions: Transaction[]): Totals {
  const income = sum(transactions.filter((t) => t.type === "income").map((t) => t.amount));
  const expense = sum(transactions.filter((t) => t.type === "expense").map((t) => t.amount));
  const net = sum([income, -expense]);
  return {
    income,
    expense,
    net,
    savingsRate: income > 0 ? net / income : null,
    count: transactions.length,
  };
}

/** Seçili türdeki işlemleri kategoriye göre toplar, tutara göre azalan sıralar */
export function getCategoryBreakdown(
  transactions: Transaction[],
  type: TransactionType,
): BreakdownItem[] {
  const groups = new Map<string, number[]>();
  for (const t of transactions) {
    if (t.type !== type) continue;
    const list = groups.get(t.category) ?? [];
    list.push(t.amount);
    groups.set(t.category, list);
  }

  const total = sum([...groups.values()].flat());
  return [...groups.entries()]
    .map(([id, amounts]) => {
      const category = getCategory(id);
      const amount = sum(amounts);
      return {
        id,
        name: category.name,
        color: category.color,
        icon: category.icon,
        amount,
        share: total > 0 ? amount / total : 0,
        count: amounts.length,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

/** Genel görünüm: gelir ve gider iki dilim */
export function getOverviewBreakdown(transactions: Transaction[]): BreakdownItem[] {
  const { income, expense } = calculateTotals(transactions);
  const total = income + expense;
  const count = (type: TransactionType) => transactions.filter((t) => t.type === type).length;

  const items: BreakdownItem[] = [
    {
      id: "income",
      name: "Gelir",
      color: OVERVIEW_COLORS.income,
      icon: "arrow-down-left",
      amount: income,
      share: total > 0 ? income / total : 0,
      count: count("income"),
    },
    {
      id: "expense",
      name: "Gider",
      color: OVERVIEW_COLORS.expense,
      icon: "arrow-up-right",
      amount: expense,
      share: total > 0 ? expense / total : 0,
      count: count("expense"),
    },
  ];
  return items.filter((i) => i.amount > 0).sort((a, b) => b.amount - a.amount);
}

export type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

export function sortTransactions(transactions: Transaction[], key: SortKey): Transaction[] {
  const sorted = [...transactions];
  const byCreated = (a: Transaction, b: Transaction) => b.createdAt.localeCompare(a.createdAt);
  switch (key) {
    case "date-desc":
      return sorted.sort((a, b) => b.date.localeCompare(a.date) || byCreated(a, b));
    case "date-asc":
      return sorted.sort((a, b) => a.date.localeCompare(b.date) || -byCreated(a, b));
    case "amount-desc":
      return sorted.sort((a, b) => b.amount - a.amount);
    case "amount-asc":
      return sorted.sort((a, b) => a.amount - b.amount);
  }
}

export interface DateGroup {
  date: string;
  items: Transaction[];
  /** Gün içindeki net tutar */
  net: number;
}

/** Sıralı listeyi ardışık tarih gruplarına böler (sıralama korunur) */
export function groupByDate(transactions: Transaction[]): DateGroup[] {
  const groups: DateGroup[] = [];
  for (const t of transactions) {
    const last = groups[groups.length - 1];
    if (last && last.date === t.date) last.items.push(t);
    else groups.push({ date: t.date, items: [t], net: 0 });
  }
  for (const g of groups) {
    g.net = sum(g.items.map((t) => (t.type === "income" ? t.amount : -t.amount)));
  }
  return groups;
}

export interface ListFilters {
  search: string;
  type: TransactionType | "all";
  category: string | "all";
}

export const EMPTY_FILTERS: ListFilters = { search: "", type: "all", category: "all" };

export function applyListFilters(transactions: Transaction[], filters: ListFilters): Transaction[] {
  const q = filters.search.trim().toLocaleLowerCase("tr-TR");
  return transactions.filter((t) => {
    if (filters.type !== "all" && t.type !== filters.type) return false;
    if (filters.category !== "all" && t.category !== filters.category) return false;
    if (!q) return true;
    const haystack = `${t.description ?? ""} ${getCategory(t.category).name}`.toLocaleLowerCase(
      "tr-TR",
    );
    return haystack.includes(q);
  });
}
