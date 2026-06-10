import type { ConfidenceBand, RootCauseSummary, RunRef } from "flake-radar/types/ci-triage";

export interface FailureSummaryCardProps {
  summary: RootCauseSummary;
  run?: RunRef;
}

const CONFIDENCE_LABEL: Record<ConfidenceBand, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
  unknown: "Unknown confidence",
};

function formatFailureClass(failureClass: string): string {
  return failureClass.replace(/_/g, " ");
}

/** Root-cause summary card with confidence band and suggested actions. */
export function FailureSummaryCard({ summary, run }: FailureSummaryCardProps) {
  const primaryAction = summary.suggestedActions[0];

  return (
    <article
      className={`failure-summary-card failure-summary-card--confidence-${summary.confidence}`}
      aria-label="CI failure root cause summary"
    >
      <header className="failure-summary-card__header">
        <div className="failure-summary-card__badges">
          <span
            className="failure-summary-card__confidence"
            data-confidence={summary.confidence}
          >
            {CONFIDENCE_LABEL[summary.confidence]}
          </span>
          <span className="failure-summary-card__class">{formatFailureClass(summary.failureClass)}</span>
        </div>
        <h2 className="failure-summary-card__headline">{summary.headline}</h2>
        {run && (
          <p className="failure-summary-card__run-meta">
            {run.provider} run <code>{run.runId}</code>
            {run.prNumber != null && (
              <>
                {" "}
                · PR #{run.prNumber}
              </>
            )}
            {run.branch && (
              <>
                {" "}
                · branch <code>{run.branch}</code>
              </>
            )}
          </p>
        )}
      </header>

      <p className="failure-summary-card__narrative">{summary.narrative}</p>

      {primaryAction && (
        <section className="failure-summary-card__action" aria-label="Suggested next action">
          <h3 className="failure-summary-card__action-label">Suggested next action</h3>
          <p className="failure-summary-card__action-text">{primaryAction}</p>
        </section>
      )}

      {summary.suggestedActions.length > 1 && (
        <section className="failure-summary-card__actions" aria-label="All suggested actions">
          <h3 className="failure-summary-card__actions-label">Additional steps</h3>
          <ol className="failure-summary-card__actions-list">
            {summary.suggestedActions.slice(1).map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ol>
        </section>
      )}

      {summary.attributedFiles && summary.attributedFiles.length > 0 && (
        <section className="failure-summary-card__files" aria-label="Attributed PR files">
          <h3 className="failure-summary-card__files-label">PR files in scope</h3>
          <ul className="failure-summary-card__files-list">
            {summary.attributedFiles.map((path) => (
              <li key={path}>
                <code>{path}</code>
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary.comparedToGreenRun && (
        <footer className="failure-summary-card__baseline">
          Compared to last green run{" "}
          {summary.comparedToGreenRun.url ? (
            <a href={summary.comparedToGreenRun.url}>#{summary.comparedToGreenRun.runId}</a>
          ) : (
            <code>{summary.comparedToGreenRun.runId}</code>
          )}{" "}
          on <code>{summary.comparedToGreenRun.branch}</code>
        </footer>
      )}
    </article>
  );
}
