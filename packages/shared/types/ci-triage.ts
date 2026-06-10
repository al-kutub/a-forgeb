/** CI provider identifiers supported in Failure Lens v1. */
export type CIProvider = "github-actions" | "gitlab-ci" | "jenkins";

/** Terminal and in-flight states for a pipeline run. */
export type RunStatus = "queued" | "running" | "success" | "failure" | "cancelled";

/** Stage lifecycle within a single pipeline run. */
export type StageStatus =
  | "pending"
  | "running"
  | "success"
  | "failure"
  | "skipped"
  | "cancelled";

/** Confidence band for automated root-cause classification. */
export type ConfidenceBand = "high" | "medium" | "low" | "unknown";

/** Known failure classes used by seeded fixtures and the classifier. */
export type FailureClass =
  | "dependency_timeout"
  | "test_assertion"
  | "infra_flake"
  | "build_compile"
  | "unknown";

/** Log line severity after distillation. */
export type LogSeverity = "debug" | "info" | "warn" | "error";

/**
 * A bounded CI stage with optional log offsets for stage-aware parsing.
 */
export interface Stage {
  id: string;
  name: string;
  order: number;
  status: StageStatus;
  startedAt?: string;
  finishedAt?: string;
  logStartLine?: number;
  logEndLine?: number;
}

/**
 * Provider-agnostic reference to a CI run (failed or green baseline).
 */
export interface RunRef {
  provider: CIProvider;
  runId: string;
  pipelineId?: string;
  branch: string;
  commitSha: string;
  prNumber?: number;
  status: RunStatus;
  url?: string;
  triggeredAt: string;
}

/**
 * A single retained log line after distillation, attributed to a stage.
 */
export interface DistilledLogLine {
  lineNumber: number;
  stageId: string;
  severity: LogSeverity;
  message: string;
  timestamp?: string;
}

/**
 * Stage-aware distilled log output for a failed or baseline run.
 */
export interface DistilledLog {
  run: RunRef;
  stages: Stage[];
  lines: DistilledLogLine[];
  originalLineCount: number;
  distilledLineCount: number;
  /** Fraction of lines removed, e.g. 0.92 means 92% volume reduction. */
  reductionRatio: number;
}

/**
 * Actionable root-cause narrative surfaced to PR checks and UI cards.
 */
export interface RootCauseSummary {
  failureClass: FailureClass;
  confidence: ConfidenceBand;
  primaryStageId: string;
  headline: string;
  narrative: string;
  suggestedActions: string[];
  attributedFiles?: string[];
  comparedToGreenRun?: RunRef;
}

/**
 * Metadata for a paired failed/green fixture used in unit and acceptance tests.
 */
export interface CITriageFixture {
  id: string;
  failureClass: FailureClass;
  description: string;
  failedRun: RunRef;
  greenRun: RunRef;
  changedFiles: string[];
  failedLogPath: string;
  greenLogPath: string;
}
