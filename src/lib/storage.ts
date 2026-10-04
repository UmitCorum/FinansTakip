import { z } from "zod";
import type { Transaction } from "@/types/finance";

/**
 * Kalıcılık katmanı. Uygulama yalnızca bu arayüzü bilir; ileride
 * localStorage yerine bir API'ye geçmek için yeni bir repository yazmak yeterli.
 */
export interface TransactionRepository {
  /** Kayıt yoksa veya veri bozuksa null döner */
  load(): Transaction[] | null;
  save(transactions: Transaction[]): void;
}

const transactionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["income", "expense"]),
  amount: z.number().positive().finite(),
  category: z.string().min(1),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  createdAt: z.string(),
});

const payloadSchema = z.object({
  version: z.literal(1),
  transactions: z.array(transactionSchema),
});

const STORAGE_KEY = "kumbara:transactions";

export function createLocalStorageRepository(key: string = STORAGE_KEY): TransactionRepository {
  return {
    load() {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw === null) return null;
        const parsed = payloadSchema.safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data.transactions : null;
      } catch {
        return null;
      }
    },
    save(transactions) {
      try {
        window.localStorage.setItem(key, JSON.stringify({ version: 1, transactions }));
      } catch {
        // Depolama dolu ya da erişim engelli: uygulama bellekte çalışmaya devam eder
      }
    },
  };
}

/** Küçük tercihler (tema vb.) için güvenli okuma/yazma */
export const preferences = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(`kumbara:${key}`);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(`kumbara:${key}`, value);
    } catch {
      // yoksay
    }
  },
};
