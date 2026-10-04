import { useMemo, useState } from "react";
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

const VIEW_META: Record<
  ChartView,
  { tab: string; center: string; description: string; empty: string }
> = {
  expense: {
    tab: "Giderler",
    center: "Toplam gider",
    description: "Harcamalar kategoriye göre. Bir kategoriye dokunursan defter ona göre süzülür.",
    empty: "Bu dönemde gider kaydı yok",
  },
  income: {
    tab: "Gelirler",
    center: "Toplam gelir",
    description: "Gelirler kaynağa göre. Bir kaynağa dokunursan defter ona göre süzülür.",
    empty: "Bu dönemde gelir kaydı yok",
  },
  overview: {
    tab: "Genel",
    center: "Net bakiye",
    description: "Gelirle giderin birbirine oranı.",
    empty: "Bu dönemde kayıt yok",
  },
};

function renderActiveShape(props: PieSectorDataItem) {
  return <Sector {...props} outerRadius={(props.outerRadius ?? 0) + 6} />;
}

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload as BreakdownItem;
  return (
    <div className="min-w-[170px] rounded-xl border border-border bg-popover px-3.5 py-3 shadow-lift">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
        {item.name}
      </div>
      <p className="tabular mt-1.5 text-base font-semibold">{formatCurrency(item.amount)}</p>
      <p className="text-small text-muted-foreground">
        Payı {formatPercent(item.share)}, {item.count} kayıt
      </p>
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
      <CardHeader>
        <CardTitle>Nereye gitti?</CardTitle>
        <CardDescription>{meta.description}</CardDescription>
        <Tabs value={view} onValueChange={handleViewChange} className="mt-3">
          <TabsList aria-label={`${periodLabel} için görünüm`}>
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
            description="Yeni bir kayıt ekle ya da üstten başka bir dönem seç."
          />
        ) : (
          <div className="grid items-start gap-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div
              className="relative mx-auto aspect-square w-full max-w-[280px]"
              role="img"
              aria-label={`${meta.tab}: ${data
                .map((d) => `${d.name} ${formatPercent(d.share)}`)
                .join(", ")}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    key={view}
                    data={data}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius="70%"
                    outerRadius="90%"
                    paddingAngle={data.length > 1 ? 2 : 0}
                    cornerRadius={3}
                    stroke="rgb(var(--surface))"
                    strokeWidth={2}
                    isAnimationActive={!reduceMotion}
                    startAngle={90}
                    endAngle={-270}
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, i) => setActiveIndex(i)}
                    onMouseLeave={() => setActiveIndex(undefined)}
                    onClick={(_, i) => onSelect(view, data[i].id)}
                    animationBegin={0}
                    animationDuration={700}
                    animationEasing="ease-out"
                    className="cursor-pointer outline-none"
                  >
                    {data.map((d) => (
                      <Cell
                        key={d.id}
                        fill={d.color}
                        className="outline-none [transition:opacity_200ms_ease]"
                        // Hover'da diğer dilimleri soldur (21st.dev Pie Chart deseni)
                        opacity={
                          activeId
                            ? markOpacity(activeId, d.id)
                            : markOpacity(selectedId, d.id, 0.35)
                        }
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
                <span className="text-small text-muted-foreground">{meta.center}</span>
                <AnimatedNumber
                  value={centerValue}
                  className={cn(
                    "mt-0.5 font-display text-[26px] font-[540] leading-tight",
                    view === "overview" && (centerValue >= 0 ? "text-income" : "text-expense"),
                  )}
                />
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
