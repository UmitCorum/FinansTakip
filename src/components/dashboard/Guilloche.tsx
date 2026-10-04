import { cn } from "@/lib/utils";

/**
 * Banknot güvenlik deseni (guilloche). Hipotrokoid eğrilerden bir rozet ve
 * faz kaydırmalı sinüs dalgalarından bir kenar bandı üretir. Yollar modül
 * yüklenirken bir kez hesaplanır; sayfa açılışında bir kez kendini çizer.
 */

function hypotrochoid(R: number, r: number, d: number, rotation: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const turns = r / gcd(R, r);
  const steps = 1800;
  const k = (R - r) / r;
  const scale = 150 / (R - r + d); // rozeti 300×300 alana sığdır
  let path = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 * turns;
    const x0 = (R - r) * Math.cos(t) + d * Math.cos(k * t);
    const y0 = (R - r) * Math.sin(t) - d * Math.sin(k * t);
    const x = 160 + scale * (x0 * Math.cos(rotation) - y0 * Math.sin(rotation));
    const y = 160 + scale * (x0 * Math.sin(rotation) + y0 * Math.cos(rotation));
    path += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return path;
}

const BAND_W = 800;

function wave(baseY: number, amplitude: number, wavelength: number, phase: number): string {
  let path = "";
  for (let x = 0; x <= BAND_W; x += 4) {
    const envelope = 0.55 + 0.45 * Math.sin((x / BAND_W) * Math.PI * 2 + phase * 0.6);
    const y = baseY + amplitude * envelope * Math.sin((x / wavelength) * Math.PI * 2 + phase);
    path += `${x === 0 ? "M" : "L"}${x} ${y.toFixed(1)}`;
  }
  return path;
}

type Ink = "primary" | "income" | "muted";

const INK_CLASS: Record<Ink, string> = {
  primary: "stroke-primary",
  income: "stroke-income",
  muted: "stroke-muted-foreground",
};

const ROSETTE: { d: string; ink: Ink; opacity: number }[] = [
  { d: hypotrochoid(150, 42, 62, 0), ink: "primary", opacity: 0.6 },
  { d: hypotrochoid(150, 42, 40, 0.12), ink: "income", opacity: 0.45 },
  { d: hypotrochoid(105, 30, 22, 0.3), ink: "muted", opacity: 0.5 },
];

const BAND: { d: string; ink: Ink; opacity: number }[] = Array.from({ length: 7 }, (_, i) => ({
  d: wave(20 + (i - 3) * 2.4, 9, 120, i * 0.45),
  ink: i % 3 === 0 ? "income" : "primary",
  opacity: 0.35 + (i % 3) * 0.08,
}));

function Paths({ paths, delay }: { paths: typeof ROSETTE; delay: (i: number) => number }) {
  return (
    <g fill="none" strokeLinejoin="round">
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          pathLength={1}
          strokeWidth={0.7}
          vectorEffect="non-scaling-stroke"
          className={cn("guilloche-path", INK_CLASS[p.ink])}
          style={{ opacity: p.opacity, animationDelay: `${delay(i)}ms` }}
        />
      ))}
    </g>
  );
}

/** Banknottaki filigran rozeti */
export function GuillocheRosette({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 320"
      aria-hidden
      focusable="false"
      className={cn("pointer-events-none", className)}
    >
      <Paths paths={ROSETTE} delay={(i) => i * 180} />
    </svg>
  );
}

/** Banknot kenarındaki dalgalı güvenlik bandı */
export function GuillocheBand({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${BAND_W} 40`}
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
      className={cn("pointer-events-none", className)}
    >
      <Paths paths={BAND} delay={(i) => 500 + i * 60} />
    </svg>
  );
}
