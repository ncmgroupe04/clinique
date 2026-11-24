export type Series = { label: string; color: string; values: number[] };

export default function GroupedBarChart({
  title,
  labels,
  series,
  width = 760,
  height = 260,
}: {
  title: string;
  labels: string[];
  series: Series[];
  width?: number;
  height?: number;
}) {
  const allValues = series.flatMap((s) => s.values);
  const max = Math.max(1, ...allValues);
  const padding = { top: 28, right: 16, bottom: 44, left: 56 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const groupW = labels.length ? innerW / labels.length : innerW;
  const bars = series.length;
  const barW = Math.max(4, (groupW - 16) / bars - 4);

  const ticks = [0, Math.round(max / 2), max];

  return (
    <div className="card">
      <h3 className="mb-3 text-base font-extrabold text-ink">{title}</h3>
      <div className="mb-2 flex flex-wrap gap-4">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        {ticks.map((t, i) => {
          const y = padding.top + innerH - (t / max) * innerH;
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2eaef" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#4b5f6b">
                {t >= 1000 ? `${Math.round(t / 1000)}k` : t}
              </text>
            </g>
          );
        })}
        {labels.map((label, li) => {
          const gx = padding.left + li * groupW + 8;
          return (
            <g key={label}>
              {series.map((s, si) => {
                const v = s.values[li] ?? 0;
                const h = (v / max) * innerH;
                const x = gx + si * (barW + 4);
                const y = padding.top + innerH - h;
                return (
                  <g key={s.label}>
                    <rect x={x} y={y} width={barW} height={h} rx={3} fill={s.color} />
                    {v > 0 && (
                      <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={9} fill="#0b1f2a">
                        {v >= 1000 ? `${Math.round(v / 1000)}k` : v}
                      </text>
                    )}
                  </g>
                );
              })}
              <text x={gx + (barW * bars) / 2} y={height - padding.bottom + 16} textAnchor="middle" fontSize={10} fill="#4b5f6b">
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
