import type {
  FlakeScore,
  QuarantinePolicyInput,
  QuarantinePolicyResult,
  QuarantineRecord,
} from "flake-radar/types/flake-radar";

const DEFAULT_SCORE_THRESHOLD = 0.35;
const POLICY_ACTOR = "flake-radar/quarantine-policy";

function isActive(record: QuarantineRecord): boolean {
  return record.status === "active";
}

function buildQuarantineRecord(score: FlakeScore, evaluatedAt: string): QuarantineRecord {
  return {
    id: `q-${score.repoId}-${score.testId}-${Date.now()}`,
    testId: score.testId,
    testName: score.testName,
    repoId: score.repoId,
    reason: "chronic_flake",
    status: "active",
    excludedFromBlocking: true,
    quarantinedAt: evaluatedAt,
    quarantinedBy: POLICY_ACTOR,
    auditNotes: `Auto-quarantined: instability score ${score.score.toFixed(3)} (pass ${(score.passRate * 100).toFixed(0)}%, fail ${(score.failRate * 100).toFixed(0)}%, rerun x${score.rerunMultiplier.toFixed(1)}).`,
  };
}

/** Evaluate flake scores and auto-quarantine chronic offenders with an audit trail. */
export function evaluateQuarantinePolicy(input: QuarantinePolicyInput): QuarantinePolicyResult {
  const threshold = input.scoreThreshold ?? DEFAULT_SCORE_THRESHOLD;
  const activeExisting = input.existing.filter(isActive);
  const activeByTestId = new Map(activeExisting.map((record) => [record.testId, record]));

  const newlyQuarantined: QuarantineRecord[] = [];

  for (const score of input.scores) {
    if (score.score < threshold || activeByTestId.has(score.testId)) {
      continue;
    }
    const record = buildQuarantineRecord(score, input.evaluatedAt);
    newlyQuarantined.push(record);
    activeByTestId.set(score.testId, record);
  }

  return {
    newlyQuarantined,
    active: [...activeByTestId.values()],
    released: input.existing.filter((record) => record.status === "released"),
  };
}

/** Tests excluded from blocking merge status (active quarantines only). */
export function blockingExcludedTestIds(records: QuarantineRecord[]): string[] {
  return records
    .filter((record) => record.status === "active" && record.excludedFromBlocking)
    .map((record) => record.testId);
}
