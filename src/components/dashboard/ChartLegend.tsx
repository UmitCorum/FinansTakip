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

/** Tutara göre sıralı kategori listesi; her satır defteri o kategoriye süzer */
export function ChartLegend({
  items,
  selectedId,
  activeIndex,
  onHover,
  onSelect,
}: ChartLegendProps) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {items.map((item, i) => {
        const selected = selectedId === item.id;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              onMouseEnter={() => onHover(i)}
              onMouseLeave={() => onHover(undefined)}
              onFocus={() => onHover(i)}
              onBlur={() => onHover(undefined)}
              aria-pressed={selected}
              className={cn(
                "grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 px-1 py-2.5 text-left transition-colors",
                activeIndex === i && "bg-accent/60",
                selected && "bg-accent",
              )}
            >
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className={cn("truncate text-sm", selected ? "font-bold" : "font-medium")}>
                {item.name}
              </span>
              <span className="tabular w-12 text-right text-small text-muted-foreground">
                {formatPercent(item.share)}
              </span>
              <span className="tabular min-w-[96px] text-right text-sm font-semibold">
                {formatCurrency(item.amount)}
              </span>
              <span aria-hidden className="col-start-2 col-end-5 mt-1.5 h-[3px] bg-border/70">
                <span
                  className="block h-full transition-[width] duration-500 ease-out"
                  style={{ width: `${item.share * 100}%`, backgroundColor: item.color }}
                />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
