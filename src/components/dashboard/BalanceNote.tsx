import type { ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { AnimatedNumber } from "@/components/dashboard/AnimatedNumber";
import { GuillocheBand, GuillocheRosette } from "@/components/dashboard/Guilloche";
import { percentChange, type Totals } from "@/lib/calculations";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

interface BalanceNoteProps {
  totals: Totals;
  /** Önceki eşdeğer dönem; "Tümü" seçiliyken null */
  previous: Totals | null;
  incomeCount: number;
  expenseCount: number;
  /** Cümle başı dönem ifadesi: "1 Ağu 2026 – 31 Eki 2026 arasında" ya da "Tüm kayıtlarda" */
  periodSentence: string;
}

/** Bakiyeyi bir banknot gibi basan ana panel: net bakiye + gelir, gider, tasarruf */
export function BalanceNote({
  totals,
  previous,
  incomeCount,
  expenseCount,
  periodSentence,
}: BalanceNoteProps) {
  const { income, expense, net, savingsRate, count } = totals;
  const negative = net < 0;
  const ratePercent = savingsRate === null ? 0 : Math.max(0, Math.min(100, savingsRate * 100));

  return (
    <section
      aria-labelledby="balance-title"
      className="relative isolate overflow-hidden rounded-note border border-note-line bg-note"
    >
      {/* Rozet sağ üstte, rakamların üstünde kalır; metnin altına girmez */}
      <GuillocheRosette className="absolute -right-16 -top-16 -z-10 h-[230px] w-[230px] opacity-60 sm:-right-10 sm:-top-14 sm:h-[300px] sm:w-[300px] sm:opacity-100" />
      <GuillocheBand className="absolute inset-x-0 bottom-0 -z-10 h-7 w-full" />

      <div className="px-5 pb-10 pt-6 sm:px-8 sm:pb-11 sm:pt-8">
        <h1 id="balance-title" className="text-small font-semibold text-muted-foreground">
          Net bakiye
        </h1>

        <AnimatedNumber
          value={net}
          duration={1.4}
          className={cn(
            "mt-2 block font-display text-[44px] font-[540] leading-[1.05] tracking-[-0.02em] sm:text-[64px]",
            negative && "text-expense",
          )}
        />
        <p className="mt-3 max-w-[46ch] text-base text-muted-foreground">
          {summarySentence(totals, previous, periodSentence)}
        </p>

        <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-note-line pt-5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-note-line">
          <Figure label="Gelir" tone="income" className="sm:pr-6">
            <AnimatedNumber value={income} />
            <Change
              current={income}
              previous={previous?.income}
              fallback={`${incomeCount} kayıt`}
            />
          </Figure>
          <Figure label="Gider" tone="expense" className="sm:px-6">
            <AnimatedNumber value={expense} />
            <Change
              current={expense}
              previous={previous?.expense}
              goodWhenUp={false}
              fallback={`${expenseCount} kayıt`}
            />
          </Figure>
          <Figure label="Tasarruf oranı" className="col-span-2 sm:col-span-1 sm:pl-6">
            {savingsRate === null ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <AnimatedNumber value={savingsRate} format={formatPercent} />
            )}
            <div
              role="meter"
              aria-label="Tasarruf oranı"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(ratePercent)}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-note-line"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                style={{ width: `${ratePercent}%` }}
              />
            </div>
          </Figure>
        </dl>
        {count === 0 && <span className="sr-only">Bu dönemde kayıt yok.</span>}
      </div>
    </section>
  );
}

function summarySentence(t: Totals, previous: Totals | null, period: string): string {
  if (t.count === 0) return "Bu dönemde henüz kayıt yok. İlk gelir ya da giderini ekleyerek başla.";
  let sentence =
    t.net < 0
      ? `${period} giderler gelirden ${formatCurrency(Math.abs(t.net))} fazla.`
      : t.savingsRate !== null
        ? `${period} gelirinin ${formatPercent(t.savingsRate)} kadarı kenarda kaldı.`
        : `${period} yalnızca gider kaydı var.`;
  const change = previous ? percentChange(t.net, previous.net) : null;
  if (change !== null && Number.isFinite(change) && Math.abs(change) >= 0.005) {
    sentence += ` Önceki döneme göre ${formatPercent(Math.abs(change))} ${change > 0 ? "daha iyi" : "daha zayıf"}.`;
  }
  return sentence;
}

function Figure({
  label,
  tone,
  className,
  children,
}: {
  label: string;
  tone?: "income" | "expense";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="flex items-center gap-2 text-small text-muted-foreground">
        {tone && (
          <span
            aria-hidden
            className={cn("h-2 w-2 rounded-full", tone === "income" ? "bg-income" : "bg-expense")}
          />
        )}
        {label}
      </dt>
      <dd className="tabular mt-1 text-heading font-semibold">{children}</dd>
    </div>
  );
}

/** Önceki döneme göre değişim; renk artışın iyi mi kötü mü olduğuna göre */
function Change({
  current,
  previous,
  goodWhenUp = true,
  fallback,
}: {
  current: number;
  previous: number | undefined;
  goodWhenUp?: boolean;
  fallback: string;
}) {
  const change = previous === undefined ? null : percentChange(current, previous);
  if (change === null || !Number.isFinite(change) || Math.abs(change) < 0.0005) {
    return (
      <span className="mt-1 block text-small font-normal text-muted-foreground">{fallback}</span>
    );
  }
  const up = change > 0;
  const good = up === goodWhenUp;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="mt-1 flex items-center gap-1.5 text-small font-normal text-muted-foreground">
      <Icon aria-hidden className={cn("h-3.5 w-3.5", good ? "text-income" : "text-expense")} />
      <span>
        <span className={cn("font-semibold", good ? "text-income" : "text-expense")}>
          {formatPercent(Math.abs(change))}
        </span>{" "}
        {up ? "artış" : "azalış"}
      </span>
    </span>
  );
}
