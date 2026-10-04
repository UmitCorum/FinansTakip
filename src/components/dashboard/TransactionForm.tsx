import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, CalendarDays, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CategoryIcon } from "@/components/dashboard/CategoryIcon";
import { getCategoriesByType } from "@/data/categories";
import { amountToInput, parseAmount, toIsoDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionInput, TransactionType } from "@/types/finance";

const MAX_DESCRIPTION = 100;

const schema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z
    .string()
    .trim()
    .min(1, "Tutar zorunludur")
    .refine((v) => !Number.isNaN(parseAmount(v)), "Geçerli bir tutar girin (ör. 1.250,50)")
    .refine((v) => parseAmount(v) > 0, "Tutar 0'dan büyük olmalı")
    .refine((v) => parseAmount(v) < 1_000_000_000, "Tutar çok büyük"),
  category: z.string().min(1, "Kategori seçin"),
  date: z.date({ required_error: "Tarih seçin", invalid_type_error: "Geçerli bir tarih seçin" }),
  description: z
    .string()
    .max(MAX_DESCRIPTION, `Açıklama en fazla ${MAX_DESCRIPTION} karakter olabilir`),
});

type FormValues = z.infer<typeof schema>;

interface TransactionFormProps {
  /** Düzenleme modunda mevcut işlem */
  initial?: Transaction;
  defaultType?: TransactionType;
  onSubmit: (input: TransactionInput) => void;
  onCancel?: () => void;
  className?: string;
}

function toDefaults(initial: Transaction | undefined, type: TransactionType): FormValues {
  return {
    type: initial?.type ?? type,
    amount: initial ? amountToInput(initial.amount) : "",
    category: initial?.category ?? "",
    date: initial ? parseISO(initial.date) : new Date(),
    description: initial?.description ?? "",
  };
}

const TYPE_OPTIONS: { value: TransactionType; label: string; icon: typeof ArrowDownLeft }[] = [
  { value: "expense", label: "Gider", icon: ArrowUpRight },
  { value: "income", label: "Gelir", icon: ArrowDownLeft },
];

export function TransactionForm({
  initial,
  defaultType = "expense",
  onSubmit,
  onCancel,
  className,
}: TransactionFormProps) {
  const uid = useId();
  const [dateOpen, setDateOpen] = useState(false);
  const isEdit = Boolean(initial);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(initial, defaultType),
  });

  const type = watch("type");
  const description = watch("description");
  const categories = getCategoriesByType(type);

  const changeType = (next: TransactionType) => {
    if (next === type) return;
    setValue("type", next);
    setValue("category", "", { shouldValidate: false });
  };

  const submit = (values: FormValues) => {
    onSubmit({
      type: values.type,
      amount: Math.round(parseAmount(values.amount) * 100) / 100,
      category: values.category,
      date: toIsoDate(values.date),
      description: values.description.trim() || undefined,
    });
    if (!isEdit) reset({ ...toDefaults(undefined, values.type), date: values.date });
  };

  const ids = {
    amount: `${uid}-amount`,
    category: `${uid}-category`,
    date: `${uid}-date`,
    description: `${uid}-description`,
  };

  return (
    <form
      onSubmit={handleSubmit(submit)}
      noValidate
      className={cn("flex flex-col gap-5", className)}
    >
      {/* Gelir / Gider segment toggle */}
      <div
        role="radiogroup"
        aria-label="İşlem türü"
        className="relative grid grid-cols-2 rounded-xl bg-muted p-1"
      >
        {TYPE_OPTIONS.map((opt) => {
          const active = type === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => changeType(opt.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                  e.preventDefault();
                  changeType(opt.value === "income" ? "expense" : "income");
                }
              }}
              tabIndex={active ? 0 : -1}
              className={cn(
                "relative z-10 flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId={`${uid}-type-pill`}
                  className={cn(
                    "absolute inset-0 -z-10 rounded-lg shadow-sm",
                    opt.value === "income" ? "bg-income" : "bg-expense",
                  )}
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <Icon className="h-4 w-4" aria-hidden />
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Tutar */}
      <div className="space-y-2">
        <Label htmlFor={ids.amount}>Tutar</Label>
        <div className="relative">
          <span
            className={cn(
              "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-semibold",
              type === "income" ? "text-income" : "text-expense",
            )}
            aria-hidden
          >
            ₺
          </span>
          <Input
            id={ids.amount}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            className="tabular h-12 pl-9 text-lg font-semibold"
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? `${ids.amount}-error` : undefined}
            {...register("amount")}
          />
        </div>
        <FieldError id={`${ids.amount}-error`} message={errors.amount?.message} />
      </div>

      {/* Kategori */}
      <div className="space-y-2">
        <Label htmlFor={ids.category}>Kategori</Label>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger
                id={ids.category}
                ref={field.ref}
                onBlur={field.onBlur}
                aria-invalid={Boolean(errors.category)}
                aria-describedby={errors.category ? `${ids.category}-error` : undefined}
              >
                <SelectValue placeholder="Kategori seçin" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError id={`${ids.category}-error`} message={errors.category?.message} />
      </div>

      {/* Tarih */}
      <div className="space-y-2">
        <Label htmlFor={ids.date}>Tarih</Label>
        <Controller
          control={control}
          name="date"
          render={({ field }) => (
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <button
                  id={ids.date}
                  type="button"
                  ref={field.ref}
                  aria-invalid={Boolean(errors.date)}
                  className="flex h-11 w-full items-center gap-2.5 rounded-xl border border-input bg-background px-3.5 text-left text-sm transition-colors hover:border-foreground/20 focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden />
                  {field.value ? (
                    format(field.value, "d MMMM yyyy, EEEE", { locale: tr })
                  ) : (
                    <span className="text-muted-foreground">Tarih seçin</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto">
                <Calendar
                  mode="single"
                  required
                  selected={field.value}
                  defaultMonth={field.value}
                  onSelect={(d) => {
                    if (d) field.onChange(d);
                    setDateOpen(false);
                  }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
          )}
        />
        <FieldError message={errors.date?.message} />
      </div>

      {/* Açıklama */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={ids.description}>
            Açıklama <span className="font-normal text-muted-foreground">(opsiyonel)</span>
          </Label>
          <span
            className={cn(
              "tabular text-xs",
              description.length > MAX_DESCRIPTION ? "text-destructive" : "text-muted-foreground",
            )}
            aria-live="polite"
          >
            {description.length}/{MAX_DESCRIPTION}
          </span>
        </div>
        <Textarea
          id={ids.description}
          rows={2}
          placeholder="Ör. Haftalık market alışverişi"
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? `${ids.description}-error` : undefined}
          {...register("description")}
        />
        <FieldError id={`${ids.description}-error`} message={errors.description?.message} />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="sm:flex-1">
            Vazgeç
          </Button>
        )}
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className={cn(
            "flex-1 text-white shadow-none",
            type === "income"
              ? "bg-income hover:bg-income/90 hover:shadow-[0_8px_24px_-8px_rgb(var(--income)/0.6)]"
              : "bg-expense hover:bg-expense/90 hover:shadow-[0_8px_24px_-8px_rgb(var(--expense)/0.6)]",
          )}
        >
          <Check aria-hidden />
          {isEdit ? "Değişiklikleri kaydet" : type === "income" ? "Gelir ekle" : "Gider ekle"}
        </Button>
      </div>
    </form>
  );
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="animate-fade-in text-xs font-medium text-destructive">
      {message}
    </p>
  );
}
