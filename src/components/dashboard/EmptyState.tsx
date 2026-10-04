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

/** Boş durum: ne olduğunu söyler ve bir sonraki adımı gösterir */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <Icon className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} aria-hidden />
      <h3 className="mt-4 font-display text-lead font-[520]">{title}</h3>
      {description && (
        <p className="mt-1 max-w-[36ch] text-small text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
