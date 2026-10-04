import { useMemo, useState } from "react";
import { filterByPeriod } from "@/lib/calculations";
import { preferences } from "@/lib/storage";
import type { Period, Transaction } from "@/types/finance";

/** label: kontrollerde görünen ad · phrase: cümle içinde kullanılan biçim */
export const PERIOD_OPTIONS: { value: Period; label: string; phrase: string }[] = [
  { value: "this-month", label: "Bu ay", phrase: "bu ay" },
  { value: "last-month", label: "Geçen ay", phrase: "geçen ay" },
  { value: "last-3-months", label: "Son 3 ay", phrase: "son 3 ayda" },
  { value: "this-year", label: "Bu yıl", phrase: "bu yıl" },
  { value: "all", label: "Tümü", phrase: "tüm kayıtlarda" },
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
  const option = PERIOD_OPTIONS.find((o) => o.value === period);

  return {
    period,
    setPeriod,
    filtered,
    label: option?.label ?? "",
    phrase: option?.phrase ?? "",
  };
}
