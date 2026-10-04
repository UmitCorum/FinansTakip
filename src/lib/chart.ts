/**
 * Grafik yardımcıları. Hover'da diğer işaretleri soldurma deseni
 * 21st.dev "Pie Chart" (arihantcodes) bileşeninin chart-kit'inden uyarlanmıştır.
 */

export const HOVER_TRANSITION = "opacity 200ms ease, filter 200ms ease";

/** Aktif bir işaret varken diğerlerini soldurur */
export function markOpacity(active: string | null, name: string, dimmed = 0.3): number {
  return active === null || active === name ? 1 : dimmed;
}

export const SERIES_COLORS = {
  income: "#22C55E",
  expense: "#F43F5E",
} as const;
