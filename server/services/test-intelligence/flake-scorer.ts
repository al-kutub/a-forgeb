import type {
  FlakeScore,
  FlakeScoreRanking,
  FlakeScoringInput,
  TestRunRecord,
} from "flake-radar/types/flake-radar";

const DEFAULT_MIN_SAMPLE_SIZE = 3;

interface TestAggregate {
  testId: string;
  testName: string;
  repoId: string;
  total: number;
  passes: number;
  fails: number;
  rerunAttempts: number;
  rerunEvents: number;
}

function aggregateRuns(runs: TestRunRecord[]): Map<string, TestAggregate> {
  const byTest = new Map<string, TestAggregate>();

  for (const run of runs) {
    const existing = byTest.get(run.testId) ?? {
      testId: run.testId,
      testName: run.testName,
      repoId: run.repoId,
      total: 0,
      passes: 0,
      fails: 0,
      rerunAttempts: 0,
      rerunEvents: 0,
    };

    existing.total += 1;
    if (run.outcome === "passed") {
      existing.passes += 1;
    } else if (run.outcome === "failed" || run.outcome === "error") {
      existing.fails += 1;
      existing.rerunAttempts += run.attempt;
      existing.rerunEvents += 1;
    }

    byTest.set(run.testId, existing);
  }

  return byTest;
}

function instabilityScore(aggregate: TestAggregate): number {
  if (aggregate.total === 0) {
    return 0;
  }

  const passRate = aggregate.passes / aggregate.total;
  const failRate = aggregate.fails / aggregate.total;
  const flipRate = passRate > 0 && failRate > 0 ? 2 * passRate * failRate : 0;
  const rerunMultiplier =
    aggregate.rerunEvents > 0 ? aggregate.rerunAttempts / aggregate.rerunEvents : 1;
  const rerunComponent = Math.min(1, (rerunMultiplier - 1) / 2);

  return Math.min(1, 0.55 * flipRate + 0.3 * failRate + 0.15 * rerunComponent);
}

function toFlakeScore(aggregate: TestAggregate, rankedAt: string): FlakeScore {
  const passRate = aggregate.passes / aggregate.total;
  const failRate = aggregate.fails / aggregate.total;
  const rerunMultiplier =
    aggregate.rerunEvents > 0 ? aggregate.rerunAttempts / aggregate.rerunEvents : 1;

  return {
    testId: aggregate.testId,
    testName: aggregate.testName,
    repoId: aggregate.repoId,
    score: instabilityScore(aggregate),
    passRate,
    failRate,
    rerunMultiplier,
    sampleSize: aggregate.total,
    rankedAt,
  };
}

/** Rank tests by instability score from a bounded run-history window. */
export function rankFlakyTests(input: FlakeScoringInput): FlakeScoreRanking {
  const minSampleSize = input.minSampleSize ?? DEFAULT_MIN_SAMPLE_SIZE;
  const rankedAt = new Date().toISOString();
  const aggregates = aggregateRuns(input.window.runs);

  const scores = [...aggregates.values()]
    .filter((aggregate) => aggregate.total >= minSampleSize)
    .map((aggregate) => toFlakeScore(aggregate, rankedAt))
    .sort((a, b) => b.score - a.score || b.failRate - a.failRate);

  return {
    repoId: input.window.repoId,
    scores,
    generatedAt: rankedAt,
  };
}
