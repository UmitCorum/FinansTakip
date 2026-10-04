import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarRange, EllipsisVertical, Moon, RotateCcw, Sun, Trash2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PERIOD_OPTIONS } from "@/hooks/usePeriodFilter";
import type { Theme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import type { Period } from "@/types/finance";

interface HeaderProps {
  period: Period;
  onPeriodChange: (period: Period) => void;
  theme: Theme;
  onToggleTheme: () => void;
  onResetToSeed: () => void;
  onClearAll: () => void;
}

type ConfirmKind = "reset" | "clear";

const CONFIRM: Record<
  ConfirmKind,
  { title: string; description: string; action: string; destructive: boolean }
> = {
  reset: {
    title: "Örnek veriler yüklensin mi?",
    description:
      "Eklediğin tüm kayıtlar silinir ve son 3 aya ait örnek kayıtlar yüklenir. Bu işlem geri alınamaz.",
    action: "Örnek verileri yükle",
    destructive: false,
  },
  clear: {
    title: "Tüm kayıtlar silinsin mi?",
    description: "Bütün gelir ve gider kayıtları kalıcı olarak silinir. Bu işlem geri alınamaz.",
    action: "Tüm kayıtları sil",
    destructive: true,
  },
};

/** Kumbara işareti: guilloche rozetli küçük bir madeni para */
function Mark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className="h-8 w-8">
      <circle cx="16" cy="16" r="15" className="fill-primary" />
      <circle
        cx="16"
        cy="16"
        r="12.5"
        className="fill-none stroke-primary-foreground"
        strokeWidth="0.8"
        opacity="0.5"
      />
      {Array.from({ length: 12 }, (_, i) => (
        <ellipse
          key={i}
          cx="16"
          cy="16"
          rx="8.5"
          ry="3.4"
          transform={`rotate(${i * 15} 16 16)`}
          className="fill-none stroke-primary-foreground"
          strokeWidth="0.7"
          opacity="0.85"
        />
      ))}
    </svg>
  );
}

export function Header({
  period,
  onPeriodChange,
  theme,
  onToggleTheme,
  onResetToSeed,
  onClearAll,
}: HeaderProps) {
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);
  const c = confirm ? CONFIRM[confirm] : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="container flex h-16 items-center gap-2 sm:gap-3">
        <a href="/" className="mr-auto flex items-center gap-2.5 rounded-lg">
          <Mark />
          <span className="font-display text-[21px] font-[560] tracking-[-0.01em]">Kumbara</span>
        </a>

        {/* Masaüstü: dönem segment kontrolü */}
        <div
          role="radiogroup"
          aria-label="Dönem"
          className="hidden h-10 items-center rounded-xl border border-border bg-surface p-1 md:flex"
        >
          {PERIOD_OPTIONS.map((o) => {
            const active = o.value === period;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onPeriodChange(o.value)}
                className={cn(
                  "relative h-full rounded-lg px-3 text-sm font-semibold transition-colors",
                  active
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="period-pill"
                    className="absolute inset-0 rounded-lg bg-primary"
                    transition={{ type: "spring", stiffness: 480, damping: 40 }}
                  />
                )}
                <span className="relative">{o.label}</span>
              </button>
            );
          })}
        </div>

        <Select value={period} onValueChange={(v) => onPeriodChange(v as Period)}>
          <SelectTrigger
            aria-label="Dönem seçin"
            className="h-10 w-[136px] bg-surface font-semibold sm:w-[160px] md:hidden"
          >
            <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {PERIOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"}
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Kayıt seçenekleri">
              <EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setConfirm("reset")}>
              <RotateCcw />
              Örnek verileri yükle
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => setConfirm("clear")}>
              <Trash2 />
              Tüm kayıtları sil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        {c && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{c.title}</AlertDialogTitle>
              <AlertDialogDescription>{c.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Vazgeç</AlertDialogCancel>
              <AlertDialogAction
                destructive={c.destructive}
                onClick={() => (confirm === "reset" ? onResetToSeed() : onClearAll())}
              >
                {c.action}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </header>
  );
}
