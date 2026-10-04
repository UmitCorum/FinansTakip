import { describe, expect, it } from "vitest";
import {
  applyListFilters,
  calculateTotals,
  filterByPeriod,
  getCashflowSeries,
  getCategoryBreakdown,
  getOverviewBreakdown,
  getPeriodRange,
  getPreviousPeriodRange,
  groupByDate,
  percentChange,
  sortTransactions,
} from "@/lib/calculations";
import { parseAmount } from "@/lib/format";
import type { Transaction } from "@/types/finance";

let seq = 0;
function tx(partial: Partial<Transaction> & Pick<Transaction, "type" | "amount">): Transaction {
  seq += 1;
  return {
    id: `t${seq}`,
    category: partial.type === "income" ? "salary" : "groceries",
    date: "2026-10-01",
    createdAt: `2026-10-01T10:00:${String(seq).padStart(2, "0")}.000Z`,
    ...partial,
  };
}

const NOW = new Date(2026, 9, 4); // 4 Ekim 2026

describe("calculateTotals", () => {
  it("gelir, gider, net ve tasarruf oranını hesaplar", () => {
    const totals = calculateTotals([
      tx({ type: "income", amount: 45000 }),
      tx({ type: "expense", amount: 16500 }),
      tx({ type: "expense", amount: 1500 }),
    ]);
    expect(totals.income).toBe(45000);
    expect(totals.expense).toBe(18000);
    expect(totals.net).toBe(27000);
    expect(totals.savingsRate).toBeCloseTo(0.6);
    expect(totals.count).toBe(3);
  });

  it("kayan nokta hatası üretmez", () => {
    const totals = calculateTotals([
      tx({ type: "expense", amount: 0.1 }),
      tx({ type: "expense", amount: 0.2 }),
    ]);
    expect(totals.expense).toBe(0.3);
  });

  it("gelir yoksa tasarruf oranı null olur", () => {
    expect(calculateTotals([tx({ type: "expense", amount: 100 })]).savingsRate).toBeNull();
    expect(calculateTotals([]).savingsRate).toBeNull();
  });

  it("gider gelirden fazlaysa negatif oran döner", () => {
    const totals = calculateTotals([
      tx({ type: "income", amount: 1000 }),
      tx({ type: "expense", amount: 1500 }),
    ]);
    expect(totals.net).toBe(-500);
    expect(totals.savingsRate).toBeCloseTo(-0.5);
  });
});

describe("getCategoryBreakdown", () => {
  const data = [
    tx({ type: "expense", amount: 300, category: "groceries" }),
    tx({ type: "expense", amount: 200, category: "groceries" }),
    tx({ type: "expense", amount: 1500, category: "rent" }),
    tx({ type: "income", amount: 9999, category: "salary" }),
  ];

  it("kategoriye göre toplar ve tutara göre azalan sıralar", () => {
    const result = getCategoryBreakdown(data, "expense");
    expect(result.map((r) => r.id)).toEqual(["rent", "groceries"]);
    expect(result[1].amount).toBe(500);
    expect(result[1].count).toBe(2);
    expect(result[1].name).toBe("Market");
  });

  it("payların toplamı 1'dir", () => {
    const result = getCategoryBreakdown(data, "expense");
    expect(result[0].share).toBeCloseTo(0.75);
    expect(result[1].share).toBeCloseTo(0.25);
    expect(result.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1);
  });

  it("veri yoksa boş dizi döner", () => {
    expect(getCategoryBreakdown([], "income")).toEqual([]);
  });
});

describe("getOverviewBreakdown", () => {
  it("gelir ve gideri iki dilim olarak döner", () => {
    const result = getOverviewBreakdown([
      tx({ type: "income", amount: 3000 }),
      tx({ type: "expense", amount: 1000 }),
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "income", amount: 3000, share: 0.75 });
    expect(result[1]).toMatchObject({ id: "expense", amount: 1000, share: 0.25 });
  });

  it("tutarı sıfır olan dilimi atlar", () => {
    const result = getOverviewBreakdown([tx({ type: "expense", amount: 50 })]);
    expect(result.map((r) => r.id)).toEqual(["expense"]);
  });
});

describe("filterByPeriod", () => {
  const data = [
    tx({ type: "expense", amount: 1, date: "2026-10-04" }),
    tx({ type: "expense", amount: 2, date: "2026-10-01" }),
    tx({ type: "expense", amount: 3, date: "2026-09-30" }),
    tx({ type: "expense", amount: 4, date: "2026-09-01" }),
    tx({ type: "expense", amount: 5, date: "2026-08-01" }),
    tx({ type: "expense", amount: 6, date: "2026-07-31" }),
    tx({ type: "expense", amount: 7, date: "2025-12-31" }),
  ];
  const amounts = (list: Transaction[]) => list.map((t) => t.amount);

  it("bu ay", () => {
    expect(amounts(filterByPeriod(data, "this-month", NOW))).toEqual([1, 2]);
  });

  it("geçen ay (ay sınırları dahil)", () => {
    expect(amounts(filterByPeriod(data, "last-month", NOW))).toEqual([3, 4]);
  });

  it("son 3 ay: içinde bulunulan ay + önceki 2 ay", () => {
    expect(amounts(filterByPeriod(data, "last-3-months", NOW))).toEqual([1, 2, 3, 4, 5]);
  });

  it("bu yıl", () => {
    expect(amounts(filterByPeriod(data, "this-year", NOW))).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("tümü", () => {
    expect(filterByPeriod(data, "all", NOW)).toHaveLength(7);
  });

  it("ocak ayında geçen ay önceki yılın aralığına düşer", () => {
    expect(getPeriodRange("last-month", new Date(2026, 0, 15))).toEqual({
      from: "2025-12-01",
      to: "2025-12-31",
    });
  });
});

describe("önceki dönem karşılaştırması", () => {
  it("bu ay: geçen ayın aynı gününe kadar", () => {
    expect(getPreviousPeriodRange("this-month", NOW)).toEqual({
      from: "2026-09-01",
      to: "2026-09-04",
    });
  });

  it("ay sonu gün taşmasını kırpar (31 Mart → 28 Şubat)", () => {
    expect(getPreviousPeriodRange("this-month", new Date(2026, 2, 31))?.to).toBe("2026-02-28");
  });

  it("son 3 ay: ondan önceki 3 ay", () => {
    expect(getPreviousPeriodRange("last-3-months", NOW)).toEqual({
      from: "2026-05-01",
      to: "2026-07-31",
    });
  });

  it("tümü için karşılaştırma yok", () => {
    expect(getPreviousPeriodRange("all", NOW)).toBeNull();
  });

  it("yüzde değişim", () => {
    expect(percentChange(120, 100)).toBeCloseTo(0.2);
    expect(percentChange(80, 100)).toBeCloseTo(-0.2);
    expect(percentChange(-50, -100)).toBeCloseTo(0.5);
    expect(percentChange(10, 0)).toBeNull();
  });
});

describe("getCashflowSeries", () => {
  const data = [
    tx({ type: "income", amount: 1000, date: "2026-10-01" }),
    tx({ type: "expense", amount: 200, date: "2026-10-01" }),
    tx({ type: "expense", amount: 50.5, date: "2026-10-03" }),
    tx({ type: "expense", amount: 999, date: "2026-08-15" }),
  ];

  it("bu ay: bugüne kadar günlük kovalar", () => {
    const { granularity, points } = getCashflowSeries(data, "this-month", NOW);
    expect(granularity).toBe("day");
    expect(points.map((p) => p.key)).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(points[0]).toMatchObject({ income: 1000, expense: 200, label: "1 Eki" });
    expect(points[2].expense).toBe(50.5);
  });

  it("son 3 ay: haftalık kovalar, toplam korunur", () => {
    const { granularity, points } = getCashflowSeries(data, "last-3-months", NOW);
    expect(granularity).toBe("week");
    const total = points.reduce((s, p) => s + p.expense, 0);
    expect(total).toBeCloseTo(1249.5);
  });

  it("bu yıl: aylık kovalar", () => {
    const { granularity, points } = getCashflowSeries(data, "this-year", NOW);
    expect(granularity).toBe("month");
    expect(points).toHaveLength(10); // Ocak–Ekim
    expect(points[7]).toMatchObject({ label: "Ağu", expense: 999 });
  });

  it("veri yoksa 'tümü' boş seri döner", () => {
    expect(getCashflowSeries([], "all", NOW).points).toEqual([]);
  });
});

describe("liste yardımcıları", () => {
  const a = tx({ type: "expense", amount: 50, date: "2026-10-02", description: "Kahve" });
  const b = tx({ type: "income", amount: 500, date: "2026-10-03" });
  const c = tx({ type: "expense", amount: 20, date: "2026-10-02", category: "rent" });

  it("tarih ve tutara göre sıralar", () => {
    expect(sortTransactions([a, b, c], "date-desc")[0].id).toBe(b.id);
    expect(sortTransactions([a, b, c], "amount-asc").map((t) => t.amount)).toEqual([20, 50, 500]);
  });

  it("aynı günü gruplar ve günlük neti hesaplar", () => {
    const groups = groupByDate(sortTransactions([a, b, c], "date-desc"));
    expect(groups.map((g) => g.date)).toEqual(["2026-10-03", "2026-10-02"]);
    expect(groups[1].net).toBe(-70);
  });

  it("açıklama ve kategori adında Türkçe duyarlı arama yapar", () => {
    const base = { type: "all", category: "all" } as const;
    expect(applyListFilters([a, b, c], { ...base, search: "kahve" })).toEqual([a]);
    expect(applyListFilters([a, b, c], { ...base, search: "KİRA" })).toEqual([c]);
    expect(applyListFilters([a, b, c], { search: "", type: "income", category: "all" })).toEqual([
      b,
    ]);
  });
});

describe("parseAmount", () => {
  it.each([
    ["1250", 1250],
    ["1.250", 1250],
    ["1.250,50", 1250.5],
    ["1250,5", 1250.5],
    ["1250.75", 1250.75],
    ["₺ 45.000", 45000],
  ])("%s → %d", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each(["", "abc", "12,3,4", "-5"])("geçersiz: %s", (input) => {
    expect(parseAmount(input)).toBeNaN();
  });
});
