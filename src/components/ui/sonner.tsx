import type * as React from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast !rounded-xl !border-border !bg-popover !text-popover-foreground !shadow-lift",
          description: "!text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground !rounded-lg !font-medium",
          cancelButton: "!bg-muted !text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
