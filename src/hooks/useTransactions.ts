import { useCallback, useEffect, useMemo, useState } from "react";
import { createSeedTransactions } from "@/data/seed";
import { createLocalStorageRepository, type TransactionRepository } from "@/lib/storage";
import type { Transaction, TransactionInput } from "@/types/finance";

const defaultRepository = createLocalStorageRepository();

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** İşlem CRUD'u + kalıcılık senkronu */
export function useTransactions(repository: TransactionRepository = defaultRepository) {
  const [transactions, setTransactions] = useState<Transaction[]>(
    () => repository.load() ?? createSeedTransactions(),
  );

  useEffect(() => {
    repository.save(transactions);
  }, [repository, transactions]);

  const add = useCallback((input: TransactionInput): Transaction => {
    const tx: Transaction = { ...input, id: newId(), createdAt: new Date().toISOString() };
    setTransactions((prev) => [tx, ...prev]);
    return tx;
  }, []);

  const update = useCallback((id: string, input: TransactionInput) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...input } : t)));
  }, []);

  const remove = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /** Silinen bir işlemi geri getirir ("Geri al") */
  const restore = useCallback((tx: Transaction) => {
    setTransactions((prev) => (prev.some((t) => t.id === tx.id) ? prev : [tx, ...prev]));
  }, []);

  const resetToSeed = useCallback(() => setTransactions(createSeedTransactions()), []);
  const clearAll = useCallback(() => setTransactions([]), []);

  return useMemo(
    () => ({ transactions, add, update, remove, restore, resetToSeed, clearAll }),
    [transactions, add, update, remove, restore, resetToSeed, clearAll],
  );
}
