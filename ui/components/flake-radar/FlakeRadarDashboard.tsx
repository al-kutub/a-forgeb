import type { FlakeRadarApiConfig } from "./api.js";
import { FlakeHeatmap } from "./FlakeHeatmap.js";
import { PipelineMetrics } from "./PipelineMetrics.js";
import { QuarantineQueue } from "./QuarantineQueue.js";
import { useFlakeRadar } from "./useFlakeRadar.js";

export interface FlakeRadarDashboardProps {
  repoId: string;
  api?: FlakeRadarApiConfig;
}

/** Operator dashboard wired to Flake Radar API routes. */
export function FlakeRadarDashboard({ repoId, api }: FlakeRadarDashboardProps) {
  const { snapshot, loading, error, refresh } = useFlakeRadar(repoId, api ?? {});

  if (loading) {
    return (
      <div className="flake-radar-dashboard flake-radar-dashboard--loading">
        Loading Flake Radar for {repoId}…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flake-radar-dashboard flake-radar-dashboard--error">
        <p>Failed to load Flake Radar snapshot.</p>
        <p className="flake-radar-error-detail">{error}</p>
        <button type="button" onClick={refresh}>
          Retry
        </button>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flake-radar-dashboard flake-radar-dashboard--empty">
        No snapshot available for {repoId}.
      </div>
    );
  }

  return (
    <div className="flake-radar-dashboard">
      <header className="flake-radar-dashboard__header">
        <h1>Flake Radar</h1>
        <p>
          Repository <code>{repoId}</code> · ranking generated{" "}
          {new Date(snapshot.ranking.generatedAt).toLocaleString()}
        </p>
        <button type="button" className="flake-radar-refresh" onClick={refresh}>
          Refresh
        </button>
      </header>

      <div className="flake-radar-dashboard__grid">
        <PipelineMetrics metrics={snapshot.metrics} />
        <FlakeHeatmap repoId={repoId} scores={snapshot.ranking.scores} />
        <QuarantineQueue records={snapshot.quarantined} />
      </div>

      {snapshot.latestSelection && (
        <aside className="flake-radar-selection">
          <h2>Predictive selection</h2>
          <p>
            Recommended {snapshot.latestSelection.recommendedTestIds.length} of{" "}
            {snapshot.latestSelection.fullSuiteTestIds.length} tests · estimated
            savings{" "}
            {Math.round(snapshot.latestSelection.estimatedTimeSavingsMs / 60000)}m ·
            confidence {(snapshot.latestSelection.confidence * 100).toFixed(0)}%
          </p>
        </aside>
      )}
    </div>
  );
}
