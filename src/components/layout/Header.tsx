import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarRange,
  EllipsisVertical,
  Moon,
  PiggyBank,
  RotateCcw,
  Sun,
  Trash2,
} from "lucide-react";
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
  DropdownMenuLabel,
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
    title: "Örnek verilere sıfırlansın mı?",
    description:
      "Eklediğiniz tüm işlemler silinecek ve panel son 3 aya ait örnek verilerle yeniden doldurulacak.",
    action: "Sıfırla",
    destructive: false,
  },
  clear: {
    title: "Tüm veriler silinsin mi?",
    description:
      "Bütün işlemler kalıcı olarak silinecek. Bu işlem geri alınamaz; panel boş olarak açılacak.",
    action: "Tümünü sil",
    destructive: true,
  },
};

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
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="container flex h-16 items-center gap-2 sm:gap-3">
        <a
          href="/"
          className="mr-auto flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#9B82FF] to-primary text-white shadow-glow">
            <PiggyBank className="h-5 w-5" strokeWidth={2.2} aria-hidden />
          </span>
          <span className="hidden flex-col leading-tight min-[420px]:flex">
            <span className="text-[15px] font-bold tracking-tight">Kumbara</span>
            <span className="text-[11px] text-muted-foreground">Kişisel finans paneli</span>
          </span>
        </a>

        {/* Masaüstü: kayan göstergeli segment kontrol */}
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
                  "relative h-full rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="period-pill"
                    className="absolute inset-0 rounded-lg bg-accent shadow-sm ring-1 ring-border"
                    transition={{ type: "spring", stiffness: 480, damping: 38 }}
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
            className="h-10 w-[136px] bg-surface sm:w-[160px] md:hidden"
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
          variant="outline"
          size="icon"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"}
          className="relative overflow-hidden"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2 }}
              className="flex"
            >
              {theme === "dark" ? <Moon /> : <Sun />}
            </motion.span>
          </AnimatePresence>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Menü">
              <EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Veri yönetimi</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => setConfirm("reset")}>
              <RotateCcw />
              Örnek verilere sıfırla
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => setConfirm("clear")}>
              <Trash2 />
              Tüm verileri temizle
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
