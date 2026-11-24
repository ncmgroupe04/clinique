export type ChartDatum = { label: string; value: number; color: string };

export default function BarChart({
  title,
  data,
  width = 520,
  height = 220,
}: {
  title: string;
  data: ChartDatum[];
  width?: number;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const padding = { top: 24, right: 16, bottom: 40, left: 44 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const barW = data.length ? innerW / data.length : 0;
  const gap = 12;
  const usableBarW = Math.max(8, barW - gap);

  // y-axis ticks
  const ticks = [0, Math.round(max / 2), max];

  return (
    <div className="card">
      <h3 className="mb-3 text-base font-extrabold text-ink">{title}</h3>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* y-axis */}
        {ticks.map((t, i) => {
          const y = padding.top + innerH - (t / max) * innerH;
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2eaef" strokeWidth={1} />
              <text x={padding.left - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#4b5f6b">
                {t}
              </text>
            </g>
          );
        })}
        {/* bars */}
        {data.map((d, i) => {
          const h = (d.value / max) * innerH;
          const x = padding.left + i * barW + gap / 2;
          const y = padding.top + innerH - h;
          return (
            <g key={i}>
              <rect x={x} y={y} width={usableBarW} height={h} rx={6} fill={d.color} />
              <text x={x + usableBarW / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="#0b1f2a">
                {d.value}
              </text>
              <text x={x + usableBarW / 2} y={height - padding.bottom + 16} textAnchor="middle" fontSize={10} fill="#4b5f6b">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
