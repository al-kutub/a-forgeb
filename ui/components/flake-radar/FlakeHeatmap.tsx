import type { FlakeScore } from "flake-radar/types/flake-radar";

export interface FlakeHeatmapProps {
  repoId: string;
  scores: FlakeScore[];
  /** Maximum rows to render (default 10). */
  limit?: number;
}

function scoreColor(score: number): string {
  const clamped = Math.min(1, Math.max(0, score));
  const hue = 120 - clamped * 120;
  return `hsl(${hue}, 65%, 42%)`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** Bar heatmap of top flaky tests for a repository. */
export function FlakeHeatmap({ repoId, scores, limit = 10 }: FlakeHeatmapProps) {
  const top = scores.slice(0, limit);

  if (top.length === 0) {
    return (
      <section className="flake-radar-panel" aria-label="Flake heatmap">
        <h2 className="flake-radar-panel__title">Top offenders — {repoId}</h2>
        <p className="flake-radar-empty">No scored tests in the current window.</p>
      </section>
    );
  }

  const maxScore = top[0]?.score ?? 1;

  return (
    <section className="flake-radar-panel" aria-label="Flake heatmap">
      <h2 className="flake-radar-panel__title">Top offenders — {repoId}</h2>
      <p className="flake-radar-panel__subtitle">
        Ranked by instability score (higher = flakier)
      </p>
      <ul className="flake-heatmap" role="list">
        {top.map((entry, index) => {
          const widthPct = maxScore > 0 ? (entry.score / maxScore) * 100 : 0;
          return (
            <li key={entry.testId} className="flake-heatmap__row">
              <span className="flake-heatmap__rank" aria-hidden="true">
                {index + 1}
              </span>
              <div className="flake-heatmap__bar-wrap">
                <div
                  className="flake-heatmap__bar"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: scoreColor(entry.score),
                  }}
                  title={`Instability ${formatPercent(entry.score)}`}
                />
                <div className="flake-heatmap__label">
                  <span className="flake-heatmap__name">{entry.testName}</span>
                  <span className="flake-heatmap__meta">
                    fail {formatPercent(entry.failRate)} · n={entry.sampleSize} ·
                    rerun ×{entry.rerunMultiplier.toFixed(2)}
                  </span>
                </div>
              </div>
              <span className="flake-heatmap__score">{formatPercent(entry.score)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
