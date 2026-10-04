import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { CashflowChart } from "@/components/dashboard/CashflowChart";
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { TransactionForm } from "@/components/dashboard/TransactionForm";
import { TransactionList } from "@/components/dashboard/TransactionList";
import { Header } from "@/components/layout/Header";
import { getCategory } from "@/data/categories";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { usePeriodFilter } from "@/hooks/usePeriodFilter";
import { useTheme } from "@/hooks/useTheme";
import { useTransactions } from "@/hooks/useTransactions";
import {
  EMPTY_FILTERS,
  calculateTotals,
  filterByRange,
  getCashflowSeries,
  getPeriodRange,
  getPreviousPeriodRange,
  type ListFilters,
  type SortKey,
} from "@/lib/calculations";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ChartView, Transaction, TransactionInput, TransactionType } from "@/types/finance";

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const store = useTransactions();
  const { period, setPeriod, filtered, label: periodLabel } = usePeriodFilter(store.transactions);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [chartView, setChartView] = useState<ChartView>("expense");
  const [filters, setFilters] = useState<ListFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const listRef = useRef<HTMLElement>(null);

  const totals = useMemo(() => calculateTotals(filtered), [filtered]);
  const counts = useMemo(
    () => ({
      income: filtered.filter((t) => t.type === "income").length,
      expense: filtered.filter((t) => t.type === "expense").length,
    }),
    [filtered],
  );

  const previousTotals = useMemo(() => {
    const range = getPreviousPeriodRange(period, new Date());
    return range ? calculateTotals(filterByRange(store.transactions, range)) : null;
  }, [store.transactions, period]);

  const cashflow = useMemo(
    () => getCashflowSeries(store.transactions, period),
    [store.transactions, period],
  );

  const rangeText = useMemo(() => {
    const range = getPeriodRange(period, new Date());
    return range ? `${formatDate(range.from)} – ${formatDate(range.to)}` : "Tüm kayıtlar";
  }, [period]);

  const selectedChartId =
    chartView === "overview"
      ? filters.category === "all" && filters.type !== "all"
        ? filters.type
        : null
      : filters.category !== "all"
        ? filters.category
        : null;

  // --- Aksiyonlar -----------------------------------------------------------

  const handleAdd = (input: TransactionInput) => {
    store.add(input);
    setSheetOpen(false);
    toast.success("İşlem eklendi", {
      description: `${getCategory(input.category).name} · ${formatCurrency(input.amount)}`,
    });
    // Eklenen türü grafikte göster
    if (chartView !== "overview" && chartView !== input.type) setChartView(input.type);
  };

  const handleUpdate = (input: TransactionInput) => {
    if (!editing) return;
    store.update(editing.id, input);
    setEditing(null);
    toast.success("İşlem güncellendi");
  };

  const confirmDelete = () => {
    if (!deleting) return;
    const tx = deleting;
    store.remove(tx.id);
    setDeleting(null);
    toast("İşlem silindi", {
      description: `${getCategory(tx.category).name} · ${formatCurrency(tx.amount)}`,
      action: { label: "Geri al", onClick: () => store.restore(tx) },
      duration: 6000,
    });
  };

  const handleChartSelect = (view: ChartView, id: string) => {
    const next: ListFilters =
      view === "overview"
        ? { ...filters, type: id as TransactionType, category: "all" }
        : { ...filters, type: view, category: id };
    const isSame = next.type === filters.type && next.category === filters.category;
    setFilters(isSame ? { ...filters, type: "all", category: "all" } : next);
    if (!isSame) listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openAdd = () => {
    if (isDesktop) document.getElementById("new-transaction")?.focus();
    else setSheetOpen(true);
  };

  return (
    <div className="app-backdrop min-h-dvh">
      <Header
        period={period}
        onPeriodChange={setPeriod}
        theme={theme}
        onToggleTheme={toggleTheme}
        onResetToSeed={() => {
          store.resetToSeed();
          setFilters(EMPTY_FILTERS);
          toast.success("Örnek veriler yüklendi");
        }}
        onClearAll={() => {
          store.clearAll();
          setFilters(EMPTY_FILTERS);
          toast.success("Tüm veriler temizlendi");
        }}
      />

      <main className="container space-y-5 py-6 pb-28 sm:space-y-6 lg:py-8 lg:pb-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-wrap items-end justify-between gap-2"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Genel bakış</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {periodLabel} · {rangeText}
            </p>
          </div>
        </motion.div>

        <SummaryCards
          totals={totals}
          previous={previousTotals}
          series={cashflow.points}
          incomeCount={counts.income}
          expenseCount={counts.expense}
        />

        <div className="grid items-start gap-5 sm:gap-6 lg:grid-cols-12">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5 sm:space-y-6 lg:col-span-7 xl:col-span-8"
          >
            <CashflowChart
              points={cashflow.points}
              granularity={cashflow.granularity}
              periodLabel={periodLabel}
              income={totals.income}
              expense={totals.expense}
            />
            <CategoryPieChart
              transactions={filtered}
              view={chartView}
              onViewChange={setChartView}
              selectedId={selectedChartId}
              onSelect={handleChartSelect}
              periodLabel={periodLabel}
            />
          </motion.div>

          {isDesktop && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="sticky top-20 lg:col-span-5 xl:col-span-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle id="new-transaction" tabIndex={-1} className="outline-none">
                    Yeni İşlem
                  </CardTitle>
                  <CardDescription>Gelir veya gider kaydı ekleyin</CardDescription>
                </CardHeader>
                <CardContent>
                  <TransactionForm onSubmit={handleAdd} />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        <TransactionList
          ref={listRef}
          transactions={filtered}
          filters={filters}
          onFiltersChange={setFilters}
          sort={sort}
          onSortChange={setSort}
          onEdit={setEditing}
          onDelete={setDeleting}
          onAdd={openAdd}
        />

        <footer className="pt-2 text-center text-xs text-muted-foreground">
          Veriler yalnızca bu tarayıcıda saklanır.
        </footer>
      </main>

      {/* Mobil: sabit "+" butonu ve alttan açılan form */}
      {!isDesktop && (
        <>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.4 }}
            className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-30"
          >
            <Button
              size="icon"
              onClick={() => setSheetOpen(true)}
              aria-label="Yeni işlem ekle"
              className="h-14 w-14 rounded-2xl [&_svg]:size-6"
            >
              <Plus />
            </Button>
          </motion.div>

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Yeni İşlem</SheetTitle>
                <SheetDescription>Gelir veya gider kaydı ekleyin</SheetDescription>
              </SheetHeader>
              <TransactionForm onSubmit={handleAdd} />
            </SheetContent>
          </Sheet>
        </>
      )}

      {/* Düzenleme */}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>İşlemi düzenle</DialogTitle>
            <DialogDescription>Bilgileri güncelleyip kaydedin.</DialogDescription>
          </DialogHeader>
          {editing && (
            <TransactionForm
              key={editing.id}
              initial={editing}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Silme onayı */}
      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>İşlem silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting &&
                `${formatDate(deleting.date)} tarihli ${formatCurrency(deleting.amount)} tutarındaki "${getCategory(deleting.category).name}" işlemi silinecek.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction destructive onClick={confirmDelete}>
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster
        theme={theme}
        position={isDesktop ? "bottom-right" : "top-center"}
        richColors={false}
      />
    </div>
  );
}
