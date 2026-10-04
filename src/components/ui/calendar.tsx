import * as React from "react";
import { DayPicker } from "react-day-picker";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      locale={tr}
      showOutsideDays={showOutsideDays}
      className={cn("p-1", className)}
      classNames={{
        root: "relative",
        months: "flex flex-col",
        month: "space-y-3",
        month_caption: "flex h-8 items-center justify-center",
        caption_label: "text-sm font-semibold capitalize",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "z-10"),
        button_next: cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "z-10"),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 text-[0.75rem] font-medium capitalize text-muted-foreground",
        week: "mt-1 flex w-full",
        day: "h-9 w-9 p-0 text-center text-sm",
        day_button:
          "h-9 w-9 rounded-lg font-normal tabular-nums transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-selected:opacity-100",
        selected:
          "[&>button]:bg-primary [&>button]:font-semibold [&>button]:text-primary-foreground [&>button]:hover:bg-primary",
        today: "[&>button]:ring-1 [&>button]:ring-primary/50",
        outside: "text-muted-foreground/50",
        disabled: "text-muted-foreground/40 [&>button]:pointer-events-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
