import type { DistilledLog, LogSeverity, Stage, StageStatus } from "flake-radar/types/ci-triage";

export interface StageErrorTimelineProps {
  distilled: DistilledLog;
  /** Stage id to highlight (typically from RootCauseSummary.primaryStageId). */
  primaryStageId?: string;
  /** Severities shown in the timeline. Defaults to warn + error. */
  severities?: LogSeverity[];
}

const STAGE_STATUS_LABEL: Record<StageStatus, string> = {
  pending: "Pending",
  running: "Running",
  success: "Success",
  failure: "Failed",
  skipped: "Skipped",
  cancelled: "Cancelled",
};

function stageDuration(stage: Stage): string | null {
  if (!stage.startedAt || !stage.finishedAt) {
    return null;
  }
  const start = Date.parse(stage.startedAt);
  const end = Date.parse(stage.finishedAt);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return null;
  }
  const seconds = Math.round((end - start) / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return rem > 0 ? `${minutes}m ${rem}s` : `${minutes}m`;
}

/** Stage-attributed error timeline from distilled CI log output. */
export function StageErrorTimeline({
  distilled,
  primaryStageId,
  severities = ["warn", "error"],
}: StageErrorTimelineProps) {
  const severitySet = new Set(severities);
  const stages = [...distilled.stages].sort((left, right) => left.order - right.order);

  const linesByStage = new Map<string, typeof distilled.lines>();
  for (const line of distilled.lines) {
    if (!severitySet.has(line.severity)) {
      continue;
    }
    const bucket = linesByStage.get(line.stageId) ?? [];
    bucket.push(line);
    linesByStage.set(line.stageId, bucket);
  }

  const stagesWithErrors = stages.filter((stage) => (linesByStage.get(stage.id)?.length ?? 0) > 0);
  const displayStages = stagesWithErrors.length > 0 ? stagesWithErrors : stages;

  return (
    <section className="stage-error-timeline" aria-label="Stage error timeline">
      <header className="stage-error-timeline__header">
        <h2 className="stage-error-timeline__title">Stage timeline</h2>
        <p className="stage-error-timeline__meta">
          {distilled.distilledLineCount} retained lines from {distilled.originalLineCount} (
          {Math.round(distilled.reductionRatio * 100)}% reduction)
        </p>
      </header>

      {displayStages.length === 0 ? (
        <p className="stage-error-timeline__empty">No stages parsed from this run.</p>
      ) : (
        <ol className="stage-error-timeline__list">
          {displayStages.map((stage) => {
            const stageLines = linesByStage.get(stage.id) ?? [];
            const isPrimary = primaryStageId === stage.id;
            const duration = stageDuration(stage);

            return (
              <li
                key={stage.id}
                className={`stage-error-timeline__stage stage-error-timeline__stage--${stage.status}${
                  isPrimary ? " stage-error-timeline__stage--primary" : ""
                }`}
              >
                <div className="stage-error-timeline__stage-header">
                  <span className="stage-error-timeline__stage-order">{stage.order + 1}</span>
                  <div className="stage-error-timeline__stage-info">
                    <h3 className="stage-error-timeline__stage-name">
                      {stage.name}
                      {isPrimary && (
                        <span className="stage-error-timeline__primary-badge">Primary failure</span>
                      )}
                    </h3>
                    <p className="stage-error-timeline__stage-status">
                      <span
                        className={`stage-error-timeline__status stage-error-timeline__status--${stage.status}`}
                      >
                        {STAGE_STATUS_LABEL[stage.status]}
                      </span>
                      {duration && <span className="stage-error-timeline__duration">{duration}</span>}
                      {stageLines.length > 0 && (
                        <span className="stage-error-timeline__error-count">
                          {stageLines.length} error line{stageLines.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {stageLines.length > 0 ? (
                  <ul className="stage-error-timeline__errors">
                    {stageLines.map((line) => (
                      <li
                        key={`${line.stageId}-${line.lineNumber}`}
                        className={`stage-error-timeline__error stage-error-timeline__error--${line.severity}`}
                      >
                        <span className="stage-error-timeline__line-number">L{line.lineNumber}</span>
                        <code className="stage-error-timeline__message">{line.message}</code>
                      </li>
                    ))}
                  </ul>
                ) : (
                  stage.status !== "success" && (
                    <p className="stage-error-timeline__no-errors">No distilled error lines for this stage.</p>
                  )
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
