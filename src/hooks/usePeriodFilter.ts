import { useMemo, useState } from "react";
import { filterByPeriod } from "@/lib/calculations";
import { preferences } from "@/lib/storage";
import type { Period, Transaction } from "@/types/finance";

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "this-month", label: "Bu ay" },
  { value: "last-month", label: "Geçen ay" },
  { value: "last-3-months", label: "Son 3 ay" },
  { value: "this-year", label: "Bu yıl" },
  { value: "all", label: "Tümü" },
];

const isPeriod = (v: string | null): v is Period => PERIOD_OPTIONS.some((o) => o.value === v);

export function usePeriodFilter(transactions: Transaction[]) {
  const [period, setPeriodState] = useState<Period>(() => {
    const saved = preferences.get("period");
    return isPeriod(saved) ? saved : "last-3-months";
  });

  const setPeriod = (p: Period) => {
    setPeriodState(p);
    preferences.set("period", p);
  };

  const filtered = useMemo(() => filterByPeriod(transactions, period), [transactions, period]);
  const label = PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? "";

  return { period, setPeriod, filtered, label };
}
