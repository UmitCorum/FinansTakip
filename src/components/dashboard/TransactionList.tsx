import { forwardRef, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FilterX, Inbox, Pencil, Search, SearchX, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryIcon } from "@/components/dashboard/CategoryIcon";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { CATEGORIES, getCategory } from "@/data/categories";
import {
  EMPTY_FILTERS,
  applyListFilters,
  groupByDate,
  sortTransactions,
  type ListFilters,
  type SortKey,
} from "@/lib/calculations";
import { formatCurrency, formatDate, formatDateGroup } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types/finance";

interface TransactionListProps {
  transactions: Transaction[];
  filters: ListFilters;
  onFiltersChange: (filters: ListFilters) => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  onAdd: () => void;
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date-desc", label: "En yeni" },
  { value: "date-asc", label: "En eski" },
  { value: "amount-desc", label: "Tutar (yüksek)" },
  { value: "amount-asc", label: "Tutar (düşük)" },
];

const PAGE_SIZE = 30;

export const TransactionList = forwardRef<HTMLElement, TransactionListProps>(
  function TransactionList(
    { transactions, filters, onFiltersChange, sort, onSortChange, onEdit, onDelete, onAdd },
    ref,
  ) {
    const [visible, setVisible] = useState(PAGE_SIZE);

    const filtered = useMemo(
      () => sortTransactions(applyListFilters(transactions, filters), sort),
      [transactions, filters, sort],
    );
    const shown = filtered.slice(0, visible);
    const grouped = sort.startsWith("date");
    const groups = useMemo(() => (grouped ? groupByDate(shown) : []), [grouped, shown]);

    const hasFilters =
      filters.search !== "" || filters.type !== "all" || filters.category !== "all";
    const categoryOptions =
      filters.type === "all" ? CATEGORIES : CATEGORIES.filter((c) => c.type === filters.type);

    const set = (patch: Partial<ListFilters>) => {
      setVisible(PAGE_SIZE);
      onFiltersChange({ ...filters, ...patch });
    };

    return (
      <section ref={ref} aria-labelledby="tx-list-title" className="scroll-mt-24">
        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="space-y-1.5">
                <CardTitle id="tx-list-title">Hesap defteri</CardTitle>
                <CardDescription>
                  {filtered.length === transactions.length
                    ? `Bu dönemde ${transactions.length} kayıt`
                    : `${transactions.length} kayıttan ${filtered.length} tanesi gösteriliyor`}
                </CardDescription>
              </div>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={() => set(EMPTY_FILTERS)}>
                  <FilterX aria-hidden />
                  Filtreleri temizle
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
              <div className="relative col-span-2 md:col-span-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  type="search"
                  value={filters.search}
                  onChange={(e) => set({ search: e.target.value })}
                  placeholder="Açıklama ya da kategori ara"
                  aria-label="Kayıt ara"
                  className="pl-10"
                />
              </div>

              <Select
                value={filters.type}
                onValueChange={(v) => set({ type: v as ListFilters["type"], category: "all" })}
              >
                <SelectTrigger aria-label="Tür filtresi">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm türler</SelectItem>
                  <SelectItem value="income">Gelir</SelectItem>
                  <SelectItem value="expense">Gider</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.category} onValueChange={(v) => set({ category: v })}>
                <SelectTrigger aria-label="Kategori filtresi">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm kategoriler</SelectItem>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
                <SelectTrigger aria-label="Sıralama" className="col-span-2 md:col-span-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="px-2 sm:px-3">
            {transactions.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Bu dönemde kayıt yok"
                description="İlk gelir ya da giderini ekleyince defter burada dolmaya başlar."
                action={<Button onClick={onAdd}>Kayıt ekle</Button>}
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="Bu aramaya uyan kayıt yok"
                description="Aramayı kısalt ya da filtreleri temizle."
                action={
                  <Button variant="outline" onClick={() => set(EMPTY_FILTERS)}>
                    Filtreleri temizle
                  </Button>
                }
              />
            ) : (
              <>
                <ColumnHeaders />
                {grouped ? (
                  <div className="space-y-2">
                    {groups.map((g) => (
                      <div key={g.date}>
                        <div className="sticky top-16 z-10 flex items-baseline justify-between border-b border-border bg-surface px-3 pb-1.5 pt-3">
                          <h3 className="text-small font-bold">{formatDateGroup(g.date)}</h3>
                          <span
                            className={cn(
                              "tabular text-small font-semibold",
                              g.net >= 0 ? "text-income" : "text-expense",
                            )}
                          >
                            {g.net >= 0 ? "+" : "−"}
                            {formatCurrency(Math.abs(g.net))}
                          </span>
                        </div>
                        <Rows items={g.items} onEdit={onEdit} onDelete={onDelete} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Rows items={shown} onEdit={onEdit} onDelete={onDelete} />
                )}

                {filtered.length > visible && (
                  <div className="flex justify-center pt-4">
                    <Button variant="outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                      {filtered.length - visible} kayıt daha göster
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </section>
    );
  },
);

function ColumnHeaders() {
  return (
    <div
      className="hidden grid-cols-[110px_minmax(0,1.2fr)_minmax(0,1.5fr)_80px_140px_76px] gap-3 px-3 pb-1 text-small text-muted-foreground md:grid"
      aria-hidden
    >
      <span>Tarih</span>
      <span>Kategori</span>
      <span>Açıklama</span>
      <span>Tür</span>
      <span className="text-right">Tutar</span>
      <span />
    </div>
  );
}

function Rows({
  items,
  onEdit,
  onDelete,
}: {
  items: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}) {
  return (
    <ul className="flex flex-col divide-y divide-border/70">
      <AnimatePresence initial={false}>
        {items.map((tx) => (
          <motion.li
            key={tx.id}
            layout="position"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -16, transition: { duration: 0.18 } }}
            transition={{ duration: 0.25 }}
          >
            <Row tx={tx} onEdit={onEdit} onDelete={onDelete} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function Row({
  tx,
  onEdit,
  onDelete,
}: {
  tx: Transaction;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}) {
  const category = getCategory(tx.category);
  const income = tx.type === "income";
  const amount = (
    <span className={cn("tabular font-semibold", income ? "text-income" : "text-expense")}>
      {income ? "+" : "−"}
      {formatCurrency(tx.amount)}
    </span>
  );
  const actions = (
    <div className="flex items-center justify-end gap-0.5 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onEdit(tx)}
        aria-label={`${category.name} kaydını düzenle`}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onDelete(tx)}
        aria-label={`${category.name} kaydını sil`}
        className="hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 />
      </Button>
    </div>
  );

  return (
    <div className="group transition-colors hover:bg-accent/50">
      {/* Masaüstü: tablo satırı */}
      <div className="hidden grid-cols-[110px_minmax(0,1.2fr)_minmax(0,1.5fr)_80px_140px_76px] items-center gap-3 px-3 py-2.5 text-sm md:grid">
        <span className="tabular text-muted-foreground">{formatDate(tx.date)}</span>
        <span className="flex min-w-0 items-center gap-2.5">
          <CategoryIcon icon={category.icon} color={category.color} size="sm" />
          <span className="truncate font-medium">{category.name}</span>
        </span>
        <span className="truncate text-muted-foreground" title={tx.description}>
          {tx.description || "—"}
        </span>
        <span>
          <Badge variant={income ? "income" : "expense"}>{income ? "Gelir" : "Gider"}</Badge>
        </span>
        <span className="text-right">{amount}</span>
        {actions}
      </div>

      {/* Mobil: kart */}
      <div className="flex items-center gap-3 px-2 py-3 md:hidden">
        <CategoryIcon icon={category.icon} color={category.color} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold">{category.name}</span>
            <span className="shrink-0 text-sm">{amount}</span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <span className="truncate text-xs text-muted-foreground">
              {tx.description || (income ? "Gelir" : "Gider")}
            </span>
            <span className="tabular shrink-0 text-xs text-muted-foreground">
              {formatDate(tx.date)}
            </span>
          </div>
        </div>
        {actions}
      </div>
    </div>
  );
}
