import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  className?: string;
  duration?: number;
}

/** Değer değiştiğinde önceki değerden yeni değere yumuşakça sayar */
export function AnimatedNumber({
  value,
  format = formatCurrency,
  className,
  duration = 0.9,
}: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? value : 0);
  const current = useRef(display);

  useEffect(() => {
    if (reduceMotion) {
      current.current = value;
      setDisplay(value);
      return;
    }
    const controls = animate(current.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        current.current = v;
        setDisplay(v);
      },
    });
    return () => controls.stop();
  }, [value, duration, reduceMotion]);

  return (
    <span className={cn("tabular", className)} aria-label={format(value)}>
      <span aria-hidden>{format(display)}</span>
    </span>
  );
}
