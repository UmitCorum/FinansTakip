export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string; // crypto.randomUUID()
  type: TransactionType;
  amount: number; // her zaman pozitif, TL
  category: string; // kategori id'si
  description?: string;
  date: string; // ISO "2026-10-04"
  createdAt: string; // ISO timestamp
}

export interface Category {
  id: string;
  name: string; // Türkçe görünen ad
  type: TransactionType;
  color: string; // grafikte kullanılacak renk (hex)
  icon: string; // lucide ikon adı
}

export type TransactionInput = Omit<Transaction, "id" | "createdAt">;

export type Period = "this-month" | "last-month" | "last-3-months" | "this-year" | "all";

export type ChartView = "expense" | "income" | "overview";
