/**
 * Flake Radar shared domain types.
 *
 * Covers run history ingestion, instability scoring, quarantine policy,
 * and predictive test selection for AI-accelerated CI pipelines.
 */

/** Outcome of a single test execution within a pipeline run. */
export type TestRunOutcome = "passed" | "failed" | "skipped" | "error";

/** One recorded test execution from CI telemetry. */
export interface TestRunRecord {
  id: string;
  repoId: string;
  pipelineId: string;
  branch: string;
  commitSha: string;
  testId: string;
  testName: string;
  /** Relative path to the test file or suite, when available. */
  suitePath?: string;
  outcome: TestRunOutcome;
  durationMs: number;
  /** 1-based rerun attempt for this commit/test pair. */
  attempt: number;
  ranAt: string;
}

/** Bounded window of run history for a repository. */
export interface RunHistoryWindow {
  repoId: string;
  since: string;
  until: string;
  runs: TestRunRecord[];
}

/** Instability score for a single test derived from recent run history. */
export interface FlakeScore {
  testId: string;
  testName: string;
  repoId: string;
  /** Normalized instability score in [0, 1]; higher means flakier. */
  score: number;
  passRate: number;
  failRate: number;
  /** Average reruns per failing invocation (1 = no reruns). */
  rerunMultiplier: number;
  sampleSize: number;
  rankedAt: string;
}

/** Ranked flake scores for a repository, highest instability first. */
export interface FlakeScoreRanking {
  repoId: string;
  scores: FlakeScore[];
  generatedAt: string;
}

export type QuarantineReason =
  | "chronic_flake"
  | "operator_manual"
  | "policy_threshold";

export type QuarantineStatus = "active" | "released" | "expired";

/** Operator-visible quarantine decision with audit metadata. */
export interface QuarantineRecord {
  id: string;
  testId: string;
  testName: string;
  repoId: string;
  reason: QuarantineReason;
  status: QuarantineStatus;
  /** When true, the test is excluded from blocking merge status. */
  excludedFromBlocking: boolean;
  quarantinedAt: string;
  quarantinedBy: string;
  releasedAt?: string;
  releasedBy?: string;
  auditNotes?: string;
}

/** Predictive subset recommendation for a pull request or branch. */
export interface SelectionRecommendation {
  id: string;
  repoId: string;
  prNumber?: number;
  branch: string;
  commitSha: string;
  recommendedTestIds: string[];
  fullSuiteTestIds: string[];
  estimatedDurationMs: number;
  fullSuiteDurationMs: number;
  estimatedTimeSavingsMs: number;
  /** Confidence in [0, 1] for the recommended subset. */
  confidence: number;
  generatedAt: string;
}

/** Single MTTR observation for dashboard trend lines. */
export interface MttrTrendPoint {
  periodStart: string;
  periodEnd: string;
  medianMinutes: number;
}

/** Pipeline health metrics surfaced on the Flake Radar dashboard. */
export interface PipelineHealthMetrics {
  repoId: string;
  rerunMultiplier: number;
  /** Queue wait time divided by compute/runtime (0–1+). */
  queueWaitRatio: number;
  mttrTrend: MttrTrendPoint[];
  capturedAt: string;
}

/** Aggregate view combining scores, quarantine state, and selection output. */
export interface FlakeRadarSnapshot {
  repoId: string;
  ranking: FlakeScoreRanking;
  quarantined: QuarantineRecord[];
  latestSelection?: SelectionRecommendation;
  metrics: PipelineHealthMetrics;
}

/** Input contract for scoring services over a run-history window. */
export interface FlakeScoringInput {
  window: RunHistoryWindow;
  /** Minimum executions required before a test is scored. */
  minSampleSize?: number;
}

/** Input contract for quarantine policy evaluation. */
export interface QuarantinePolicyInput {
  scores: FlakeScore[];
  existing: QuarantineRecord[];
  /** Instability threshold in [0, 1] for auto-quarantine. */
  scoreThreshold?: number;
  evaluatedAt: string;
}

/** Output of quarantine policy evaluation. */
export interface QuarantinePolicyResult {
  newlyQuarantined: QuarantineRecord[];
  active: QuarantineRecord[];
  released: QuarantineRecord[];
}

/** Input contract for predictive test selection. */
export interface PredictiveSelectionInput {
  repoId: string;
  branch: string;
  commitSha: string;
  prNumber?: number;
  changedPaths: string[];
  availableTestIds: string[];
  /** Optional map from test id to suite file path for path-based matching. */
  suitePathsByTestId?: Record<string, string>;
  historicalDurationsMs: Record<string, number>;
  requestedAt: string;
}
