import { useId, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  type TooltipProps,
} from "recharts";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";
import { ChartPie } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedNumber } from "@/components/dashboard/AnimatedNumber";
import { CategoryIcon } from "@/components/dashboard/CategoryIcon";
import { ChartGlowFilter } from "@/components/dashboard/ChartGlowFilter";
import { ChartLegend } from "@/components/dashboard/ChartLegend";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  calculateTotals,
  getCategoryBreakdown,
  getOverviewBreakdown,
  type BreakdownItem,
} from "@/lib/calculations";
import { markOpacity } from "@/lib/chart";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChartView, Transaction } from "@/types/finance";

interface CategoryPieChartProps {
  transactions: Transaction[];
  view: ChartView;
  onViewChange: (view: ChartView) => void;
  selectedId: string | null;
  onSelect: (view: ChartView, id: string) => void;
  periodLabel: string;
  className?: string;
}

const VIEW_META: Record<ChartView, { tab: string; center: string; empty: string }> = {
  expense: { tab: "Giderler", center: "Toplam gider", empty: "Bu dönemde gider kaydı yok" },
  income: { tab: "Gelirler", center: "Toplam gelir", empty: "Bu dönemde gelir kaydı yok" },
  overview: { tab: "Genel", center: "Net bakiye", empty: "Bu dönemde işlem yok" },
};

function renderActiveShape(props: PieSectorDataItem) {
  return (
    <g>
      <Sector {...props} outerRadius={(props.outerRadius ?? 0) + 7} />
      <Sector
        {...props}
        innerRadius={(props.outerRadius ?? 0) + 10}
        outerRadius={(props.outerRadius ?? 0) + 12}
        opacity={0.35}
      />
    </g>
  );
}

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload as BreakdownItem;
  return (
    <div className="min-w-[180px] rounded-xl border border-border bg-popover/95 px-3.5 py-3 shadow-lift backdrop-blur">
      <div className="flex items-center gap-2.5">
        <CategoryIcon icon={item.icon} color={item.color} size="sm" />
        <span className="text-sm font-semibold">{item.name}</span>
      </div>
      <div className="mt-2.5 flex items-baseline justify-between gap-4">
        <span className="tabular text-base font-bold">{formatCurrency(item.amount)}</span>
        <span
          className="tabular rounded-md px-1.5 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: `${item.color}22`, color: item.color }}
        >
          {formatPercent(item.share)}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{item.count} işlem</p>
    </div>
  );
}

export function CategoryPieChart({
  transactions,
  view,
  onViewChange,
  selectedId,
  onSelect,
  periodLabel,
  className,
}: CategoryPieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>();
  const glowId = `pie-glow-${useId().replace(/:/g, "")}`;
  const reduceMotion = useReducedMotion();

  const data = useMemo(
    () =>
      view === "overview"
        ? getOverviewBreakdown(transactions)
        : getCategoryBreakdown(transactions, view),
    [transactions, view],
  );

  const totals = useMemo(() => calculateTotals(transactions), [transactions]);
  const centerValue =
    view === "income" ? totals.income : view === "expense" ? totals.expense : totals.net;
  const meta = VIEW_META[view];
  const activeId = activeIndex !== undefined ? (data[activeIndex]?.id ?? null) : null;

  const handleViewChange = (v: string) => {
    setActiveIndex(undefined);
    onViewChange(v as ChartView);
  };

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Kategori Dağılımı</CardTitle>
          <CardDescription>
            {periodLabel} · dilime veya listeye tıklayarak filtreleyin
          </CardDescription>
        </div>
        <Tabs value={view} onValueChange={handleViewChange}>
          <TabsList aria-label="Grafik görünümü">
            {(Object.keys(VIEW_META) as ChartView[]).map((v) => (
              <TabsTrigger key={v} value={v}>
                {VIEW_META[v].tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="flex-1">
        {data.length === 0 ? (
          <EmptyState
            icon={ChartPie}
            title={meta.empty}
            description="Yeni bir işlem ekleyin ya da üstten farklı bir dönem seçin."
          />
        ) : (
          <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div
              className="relative mx-auto aspect-square w-full max-w-[300px]"
              role="img"
              aria-label={`${meta.tab} pasta grafiği: ${data
                .map((d) => `${d.name} ${formatPercent(d.share)}`)
                .join(", ")}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <ChartGlowFilter id={glowId} />
                  </defs>
                  <Pie
                    key={view}
                    data={data}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius="64%"
                    outerRadius="86%"
                    paddingAngle={data.length > 1 ? 3 : 0}
                    cornerRadius={8}
                    stroke="rgb(var(--surface))"
                    strokeWidth={1.5}
                    isAnimationActive={!reduceMotion}
                    startAngle={90}
                    endAngle={-270}
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, i) => setActiveIndex(i)}
                    onMouseLeave={() => setActiveIndex(undefined)}
                    onClick={(_, i) => onSelect(view, data[i].id)}
                    animationBegin={0}
                    animationDuration={900}
                    animationEasing="ease-out"
                    className="cursor-pointer outline-none"
                  >
                    {data.map((d) => (
                      <Cell
                        key={d.id}
                        fill={d.color}
                        className="outline-none [transition:opacity_200ms_ease]"
                        // 21st Pie Chart deseni: hover'da diğer dilimleri soldur, aktif dilimi parlat
                        opacity={
                          activeId
                            ? markOpacity(activeId, d.id)
                            : markOpacity(selectedId, d.id, 0.35)
                        }
                        filter={activeId === d.id ? `url(#${glowId})` : undefined}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={false}
                    wrapperStyle={{ zIndex: 20 }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {meta.center}
                </span>
                <AnimatedNumber
                  value={centerValue}
                  className={cn(
                    "mt-1 text-xl font-bold tracking-tight sm:text-2xl",
                    view === "overview" && (centerValue >= 0 ? "text-income" : "text-expense"),
                  )}
                />
                <span className="mt-1 text-xs text-muted-foreground">
                  {view === "overview" ? `${totals.count} işlem` : `${data.length} kategori`}
                </span>
              </div>
            </div>

            <ChartLegend
              items={data}
              selectedId={selectedId}
              activeIndex={activeIndex}
              onHover={setActiveIndex}
              onSelect={(id) => onSelect(view, id)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
