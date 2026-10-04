import { motion } from "framer-motion";
import { CategoryIcon } from "@/components/dashboard/CategoryIcon";
import type { BreakdownItem } from "@/lib/calculations";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ChartLegendProps {
  items: BreakdownItem[];
  selectedId: string | null;
  activeIndex: number | undefined;
  onHover: (index: number | undefined) => void;
  onSelect: (id: string) => void;
}

export function ChartLegend({
  items,
  selectedId,
  activeIndex,
  onHover,
  onSelect,
}: ChartLegendProps) {
  return (
    <ul className="-mx-1 flex flex-col gap-0.5 px-1">
      {items.map((item, i) => {
        const selected = selectedId === item.id;
        const highlighted = activeIndex === i;
        return (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.035 }}
          >
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              onMouseEnter={() => onHover(i)}
              onMouseLeave={() => onHover(undefined)}
              onFocus={() => onHover(i)}
              onBlur={() => onHover(undefined)}
              aria-pressed={selected}
              title={`İşlemleri "${item.name}" ile filtrele`}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                highlighted && "bg-accent",
                selected ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-accent",
              )}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
                aria-hidden
              />
              <CategoryIcon icon={item.icon} color={item.color} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{item.name}</span>
                  <span className="tabular shrink-0 text-sm font-semibold">
                    {formatCurrency(item.amount)}
                  </span>
                </span>
                <span className="mt-1 flex items-center gap-2">
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                    <motion.span
                      className="block h-full rounded-full"
                      style={{ backgroundColor: item.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.share * 100}%` }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </span>
                  <span className="tabular w-12 shrink-0 text-right text-xs text-muted-foreground">
                    {formatPercent(item.share)}
                  </span>
                </span>
              </span>
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}
