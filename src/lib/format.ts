import { format, isToday, isYesterday, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

const currencyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

const percentFormatter = new Intl.NumberFormat("tr-TR", {
  style: "percent",
  maximumFractionDigits: 1,
});

const compactFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

/** Eksen etiketleri için: 45000 → "₺45 B" */
export function formatCompactCurrency(value: number): string {
  return compactFormatter.format(value);
}

/** 0.256 → "%25,6" */
export function formatPercent(ratio: number): string {
  return percentFormatter.format(ratio);
}

/** "2026-10-04" → "4 Eki 2026" */
export function formatDate(isoDate: string): string {
  return format(parseISO(isoDate), "d MMM yyyy", { locale: tr });
}

/** Liste grupları için: "Bugün", "Dün" veya "28 Eyl 2026" */
export function formatDateGroup(isoDate: string, now: Date = new Date()): string {
  const d = parseISO(isoDate);
  if (isToday(d) && sameDay(now, new Date())) return "Bugün";
  if (isYesterday(d) && sameDay(now, new Date())) return "Dün";
  return format(d, "d MMM yyyy, EEEE", { locale: tr });
}

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Kullanıcı girişini sayıya çevirir. Türkçe ("1.250,50") ve
 * düz ("1250.50") biçimlerini kabul eder. Geçersizse NaN döner.
 */
export function parseAmount(raw: string): number {
  const s = raw.replace(/[\s₺]/g, "");
  if (s === "") return NaN;

  let normalized: string;
  if (s.includes(",")) {
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    normalized = s.replace(/\./g, "");
  } else {
    normalized = s;
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) return NaN;
  return Number(normalized);
}

/** Form alanında göstermek için: 1250.5 → "1250,5" */
export function amountToInput(value: number): string {
  return String(value).replace(".", ",");
}
