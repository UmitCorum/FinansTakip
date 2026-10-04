import { useId, useMemo, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import {
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  Scale,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AnimatedNumber } from "@/components/dashboard/AnimatedNumber";
import { percentChange, type CashflowPoint, type Totals } from "@/lib/calculations";
import { SERIES_COLORS } from "@/lib/chart";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

interface SummaryCardsProps {
  totals: Totals;
  /** Önceki eşdeğer dönem; "Tümü" seçiliyken null */
  previous: Totals | null;
  series: CashflowPoint[];
  incomeCount: number;
  expenseCount: number;
}

type Tone = "income" | "expense" | "primary";

const CHIP: Record<Tone, string> = {
  income: "bg-income/10 text-income ring-income/20",
  expense: "bg-expense/10 text-expense ring-expense/20",
  primary: "bg-primary/10 text-primary ring-primary/20",
};

/** Önceki döneme göre değişim göstergesi */
function Trend({
  change,
  goodWhenUp = true,
  unit = "percent",
  fallback,
}: {
  change: number | null;
  goodWhenUp?: boolean;
  unit?: "percent" | "points";
  fallback: string;
}) {
  if (change === null || !Number.isFinite(change)) {
    return <span className="text-muted-foreground">{fallback}</span>;
  }
  const flat = Math.abs(change) < 0.0005;
  const up = change > 0;
  const good = flat ? null : up === goodWhenUp;
  const Icon = up ? TrendingUp : TrendingDown;
  const value =
    unit === "percent"
      ? formatPercent(Math.abs(change))
      : `${(Math.abs(change) * 100).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} puan`;

  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span
        className={cn(
          "tabular inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold",
          good === null && "bg-muted text-muted-foreground",
          good === true && "bg-income/10 text-income",
          good === false && "bg-expense/10 text-expense",
        )}
      >
        {!flat && <Icon className="h-3 w-3" aria-hidden />}
        {value}
      </span>
      <span className="hidden truncate text-muted-foreground sm:inline">önceki döneme göre</span>
      <span className="sr-only">{up ? "artış" : "azalış"}, önceki döneme göre</span>
    </span>
  );
}

function Sparkline({ data, color }: { data: { v: number }[]; color: string }) {
  const id = useId().replace(/:/g, "");
  const reduceMotion = useReducedMotion();
  if (data.length < 2) return <div className="h-12" />;
  return (
    <div className="pointer-events-none -mx-4 -mb-4 mt-3 h-12 sm:-mx-5 sm:-mb-5" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#spark-${id})`}
            isAnimationActive={!reduceMotion}
            animationDuration={900}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatCard({
  index,
  label,
  icon: Icon,
  tone,
  value,
  footer,
  chart,
}: {
  index: number;
  label: string;
  icon: LucideIcon;
  tone: Tone;
  value: ReactNode;
  footer: ReactNode;
  chart?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="group relative flex h-full flex-col overflow-hidden p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-lift sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 sm:h-8 sm:w-8",
              CHIP[tone],
            )}
            aria-hidden
          >
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.2} />
          </span>
        </div>
        <div className="mt-2.5 text-lg font-bold tracking-tight sm:mt-3 sm:text-[1.65rem] sm:leading-8">
          {value}
        </div>
        <div className="mt-2 text-xs">{footer}</div>
        <div className="mt-auto">{chart}</div>
      </Card>
    </motion.div>
  );
}

export function SummaryCards({
  totals,
  previous,
  series,
  incomeCount,
  expenseCount,
}: SummaryCardsProps) {
  const { income, expense, net, savingsRate } = totals;
  const ratePercent = savingsRate === null ? 0 : Math.max(0, Math.min(100, savingsRate * 100));
  const positive = net >= 0;

  const sparks = useMemo(() => {
    let running = 0;
    return {
      income: series.map((p) => ({ v: p.income })),
      expense: series.map((p) => ({ v: p.expense })),
      net: series.map((p) => {
        running += p.income - p.expense;
        return { v: running };
      }),
    };
  }, [series]);

  const change = (cur: number, prev: number | undefined) =>
    prev === undefined ? null : percentChange(cur, prev);
  const rateChange =
    previous && savingsRate !== null && previous.savingsRate !== null
      ? savingsRate - previous.savingsRate
      : null;

  return (
    <section aria-label="Özet" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <StatCard
        index={0}
        label="Toplam Gelir"
        icon={ArrowDownLeft}
        tone="income"
        value={<AnimatedNumber value={income} />}
        footer={
          <Trend change={change(income, previous?.income)} fallback={`${incomeCount} işlem`} />
        }
        chart={<Sparkline data={sparks.income} color={SERIES_COLORS.income} />}
      />

      <StatCard
        index={1}
        label="Toplam Gider"
        icon={ArrowUpRight}
        tone="expense"
        value={<AnimatedNumber value={expense} />}
        footer={
          <Trend
            change={change(expense, previous?.expense)}
            goodWhenUp={false}
            fallback={`${expenseCount} işlem`}
          />
        }
        chart={<Sparkline data={sparks.expense} color={SERIES_COLORS.expense} />}
      />

      <StatCard
        index={2}
        label="Net Bakiye"
        icon={Scale}
        tone={positive ? "income" : "expense"}
        value={<AnimatedNumber value={net} className={positive ? "text-income" : "text-expense"} />}
        footer={
          <Trend
            change={change(net, previous?.net)}
            fallback={positive ? "Gelir giderden fazla" : "Gider gelirden fazla"}
          />
        }
        chart={<Sparkline data={sparks.net} color="#8B5CF6" />}
      />

      <StatCard
        index={3}
        label="Tasarruf Oranı"
        icon={PiggyBank}
        tone="primary"
        value={
          savingsRate === null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <AnimatedNumber
              value={savingsRate}
              format={formatPercent}
              className={savingsRate < 0 ? "text-expense" : undefined}
            />
          )
        }
        footer={<Trend change={rateChange} unit="points" fallback="Gelirin kalan payı" />}
        chart={
          <div className="mt-4 space-y-1.5 pb-1">
            <Progress
              value={ratePercent}
              aria-label="Tasarruf oranı"
              className="h-2"
              indicatorClassName="bg-gradient-to-r from-primary to-[#A78BFA]"
            />
            <div className="tabular flex justify-between text-[10px] text-muted-foreground">
              <span>%0</span>
              <span>%50</span>
              <span>%100</span>
            </div>
          </div>
        }
      />
    </section>
  );
}
