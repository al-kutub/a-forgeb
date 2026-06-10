import type {
  PredictiveSelectionInput,
  SelectionRecommendation,
} from "flake-radar/types/flake-radar";

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

function pathMatchesChangedSuite(suitePath: string | undefined, changedPaths: string[]): boolean {
  if (!suitePath) {
    return false;
  }
  const normalizedSuite = normalizePath(suitePath);
  return changedPaths.some((changed) => {
    const normalizedChanged = normalizePath(changed);
    return (
      normalizedSuite.startsWith(normalizedChanged) ||
      normalizedChanged.startsWith(normalizedSuite) ||
      normalizedSuite.includes(normalizedChanged) ||
      normalizedChanged.includes(normalizedSuite)
    );
  });
}

function sumDuration(testIds: string[], durations: Record<string, number>): number {
  return testIds.reduce((total, testId) => total + (durations[testId] ?? 0), 0);
}

/** Recommend a minimal test subset for a PR based on changed paths and historical durations. */
export function recommendTestSubset(input: PredictiveSelectionInput): SelectionRecommendation {
  const changedPaths = input.changedPaths.map(normalizePath);
  const matched = input.availableTestIds.filter((testId) => {
    const suitePath = input.suitePathsByTestId?.[testId];
    if (suitePath) {
      return pathMatchesChangedSuite(suitePath, changedPaths);
    }
    return changedPaths.some((changed) => changed.includes(testId) || testId.includes(changed));
  });

  const recommendedTestIds =
    matched.length > 0 ? [...new Set(matched)] : [input.availableTestIds[0]].filter(Boolean);

  const fullSuiteDurationMs = sumDuration(input.availableTestIds, input.historicalDurationsMs);
  const estimatedDurationMs = sumDuration(recommendedTestIds, input.historicalDurationsMs);
  const estimatedTimeSavingsMs = Math.max(0, fullSuiteDurationMs - estimatedDurationMs);
  const coverageRatio =
    input.availableTestIds.length > 0 ? recommendedTestIds.length / input.availableTestIds.length : 0;
  const confidence = Math.min(1, 0.55 + coverageRatio * 0.35);

  return {
    id: `selection-${input.repoId}-${input.commitSha}`,
    repoId: input.repoId,
    prNumber: input.prNumber,
    branch: input.branch,
    commitSha: input.commitSha,
    recommendedTestIds,
    fullSuiteTestIds: input.availableTestIds,
    estimatedDurationMs,
    fullSuiteDurationMs,
    estimatedTimeSavingsMs,
    confidence,
    generatedAt: input.requestedAt,
  };
}
