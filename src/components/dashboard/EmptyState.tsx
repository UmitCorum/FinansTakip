import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex animate-fade-in flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      <div className="relative mb-5">
        <div className="absolute inset-0 -m-3 rounded-full bg-primary/10 blur-xl" aria-hidden />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-gradient-to-b from-accent to-surface shadow-card">
          <Icon className="h-7 w-7 text-primary" strokeWidth={1.8} aria-hidden />
        </div>
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
