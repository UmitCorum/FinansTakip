/** SVG parlama filtresi — 21st.dev "Pie Chart" chart-kit'indeki ChartGlowFilter'dan uyarlandı */
export function ChartGlowFilter({ id, blur = 6 }: { id: string; blur?: number }) {
  return (
    <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
      <feColorMatrix
        in="blur"
        type="matrix"
        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.55 0"
      />
      <feMerge>
        <feMergeNode />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}
