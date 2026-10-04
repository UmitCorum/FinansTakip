import { useId, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { ChartSpline } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/EmptyState";
import type { CashflowPoint, Granularity } from "@/lib/calculations";
import { HOVER_TRANSITION, SERIES_COLORS, markOpacity } from "@/lib/chart";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface CashflowChartProps {
  points: CashflowPoint[];
  granularity: Granularity;
  periodLabel: string;
  income: number;
  expense: number;
  className?: string;
}

const GRANULARITY_LABEL: Record<Granularity, string> = {
  day: "Günlük",
  week: "Haftalık",
  month: "Aylık",
};

const SERIES = [
  { key: "income", label: "Gelir", color: SERIES_COLORS.income },
  { key: "expense", label: "Gider", color: SERIES_COLORS.expense },
] as const;

function CashflowTooltip({
  active,
  payload,
  label,
  granularity,
}: TooltipProps<number, string> & { granularity?: Granularity }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as CashflowPoint;
  const net = point.income - point.expense;
  return (
    <div className="min-w-[190px] rounded-xl border border-border bg-popover/95 px-3.5 py-3 text-sm shadow-lift backdrop-blur">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        {granularity === "week" ? `${label} haftası` : label}
      </p>
      {SERIES.map((s) => (
        <div key={s.key} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
          <span className="tabular font-semibold">{formatCurrency(point[s.key])}</span>
        </div>
      ))}
      <div className="mt-2 flex items-center justify-between gap-4 border-t border-border pt-2">
        <span className="text-muted-foreground">Net</span>
        <span className={cn("tabular font-bold", net >= 0 ? "text-income" : "text-expense")}>
          {net >= 0 ? "+" : "−"}
          {formatCurrency(Math.abs(net))}
        </span>
      </div>
    </div>
  );
}

export function CashflowChart({
  points,
  granularity,
  periodLabel,
  income,
  expense,
  className,
}: CashflowChartProps) {
  const id = useId().replace(/:/g, "");
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState<string | null>(null);
  const hasData = points.some((p) => p.income > 0 || p.expense > 0);
  const totals = { income, expense };

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Nakit Akışı</CardTitle>
          <CardDescription>
            {GRANULARITY_LABEL[granularity]} gelir ve gider · {periodLabel}
          </CardDescription>
        </div>
        <div className="flex gap-2" role="group" aria-label="Seriler">
          {SERIES.map((s) => (
            <button
              key={s.key}
              type="button"
              onMouseEnter={() => setActive(s.key)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(s.key)}
              onBlur={() => setActive(null)}
              className="rounded-xl border border-border px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
              <span className="tabular mt-0.5 block text-sm font-semibold">
                {formatCurrency(totals[s.key])}
              </span>
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex-1 pl-1 sm:pl-2">
        {!hasData ? (
          <EmptyState
            icon={ChartSpline}
            title="Bu dönemde hareket yok"
            description="İşlem ekledikçe gelir ve gider akışınız burada görünecek."
          />
        ) : (
          <div
            className="h-[260px] w-full sm:h-[280px]"
            role="img"
            aria-label={`Nakit akışı grafiği: toplam gelir ${formatCurrency(income)}, toplam gider ${formatCurrency(expense)}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 8, right: 24, bottom: 0, left: 0 }}>
                <defs>
                  {SERIES.map((s) => (
                    <linearGradient key={s.key} id={`${id}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.color} stopOpacity={0.32} />
                      <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="rgb(var(--border))" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  minTickGap={24}
                  tick={{ fill: "rgb(var(--muted))", fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tickFormatter={formatCompactCurrency}
                  tick={{ fill: "rgb(var(--muted))", fontSize: 12 }}
                />
                <Tooltip
                  content={<CashflowTooltip granularity={granularity} />}
                  cursor={{
                    stroke: "rgb(var(--muted))",
                    strokeDasharray: "4 4",
                    strokeOpacity: 0.5,
                  }}
                />
                {SERIES.map((s) => (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2.25}
                    fill={`url(#${id}-${s.key})`}
                    activeDot={{ r: 4.5, strokeWidth: 2, stroke: "rgb(var(--surface))" }}
                    isAnimationActive={!reduceMotion}
                    animationDuration={900}
                    style={{
                      opacity: markOpacity(active, s.key, 0.2),
                      transition: HOVER_TRANSITION,
                    }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
