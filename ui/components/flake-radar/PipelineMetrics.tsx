import type {
  MttrTrendPoint,
  PipelineHealthMetrics,
} from "flake-radar/types/flake-radar";

export interface PipelineMetricsProps {
  metrics: PipelineHealthMetrics;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes.toFixed(0)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h ${rem.toFixed(0)}m` : `${hours}h`;
}

function formatRatio(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

interface SparklineProps {
  points: MttrTrendPoint[];
  width?: number;
  height?: number;
}

/** Simple SVG sparkline for MTTR median trend. */
function MttrSparkline({ points, width = 280, height = 64 }: SparklineProps) {
  if (points.length === 0) {
    return <p className="flake-radar-empty">No MTTR history yet.</p>;
  }

  const values = points.map((p) => p.medianMinutes);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = 4;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const coords = points.map((point, i) => {
    const x =
      points.length === 1
        ? width / 2
        : padding + (i / (points.length - 1)) * innerW;
    const y =
      padding + innerH - ((point.medianMinutes - min) / range) * innerH;
    return { x, y, point };
  });

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");

  return (
    <figure className="mttr-sparkline">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label="MTTR median trend"
      >
        <polyline
          fill="none"
          stroke="var(--flake-radar-accent, #2563eb)"
          strokeWidth="2"
          points={polyline}
        />
        {coords.map((c) => (
          <circle
            key={c.point.periodStart}
            cx={c.x}
            cy={c.y}
            r="3"
            fill="var(--flake-radar-accent, #2563eb)"
          >
            <title>
              {formatMinutes(c.point.medianMinutes)} (
              {new Date(c.point.periodStart).toLocaleDateString()} –{" "}
              {new Date(c.point.periodEnd).toLocaleDateString()})
            </title>
          </circle>
        ))}
      </svg>
      <figcaption className="mttr-sparkline__legend">
        Latest median: {formatMinutes(values[values.length - 1] ?? 0)}
      </figcaption>
    </figure>
  );
}

/** Pipeline health metrics: MTTR trend, rerun multiplier, queue-wait ratio. */
export function PipelineMetrics({ metrics }: PipelineMetricsProps) {
  return (
    <section className="flake-radar-panel" aria-label="Pipeline metrics">
      <h2 className="flake-radar-panel__title">Pipeline health</h2>
      <p className="flake-radar-panel__subtitle">
        Captured {new Date(metrics.capturedAt).toLocaleString()}
      </p>

      <div className="pipeline-metrics-grid">
        <article className="metric-card">
          <h3 className="metric-card__label">Rerun multiplier</h3>
          <p className="metric-card__value">×{metrics.rerunMultiplier.toFixed(2)}</p>
          <p className="metric-card__hint">Avg reruns per failing test invocation</p>
        </article>

        <article className="metric-card">
          <h3 className="metric-card__label">Queue-wait ratio</h3>
          <p className="metric-card__value">{formatRatio(metrics.queueWaitRatio)}</p>
          <p className="metric-card__hint">Queue time ÷ compute runtime</p>
        </article>

        <article className="metric-card metric-card--wide">
          <h3 className="metric-card__label">MTTR trend</h3>
          <MttrSparkline points={metrics.mttrTrend} />
        </article>
      </div>
    </section>
  );
}
