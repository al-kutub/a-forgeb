import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSeededRunHistory,
  SEEDED_ALL_TEST_IDS,
  SEEDED_HISTORICAL_DURATIONS_MS,
  SEEDED_REPO_ID,
} from "../../fixtures/run-history.js";
import { recommendTestSubset } from "./predictive-selection.js";

describe("recommendTestSubset", () => {
  it("returns a minimal subset with estimated time savings", () => {
    const window = buildSeededRunHistory();
    const suitePathsByTestId = Object.fromEntries(
      window.runs
        .filter((run) => run.suitePath)
        .map((run) => [run.testId, run.suitePath as string]),
    );

    const recommendation = recommendTestSubset({
      repoId: SEEDED_REPO_ID,
      branch: "feature/auth-fix",
      commitSha: "def456",
      prNumber: 42,
      changedPaths: ["tests/auth/session.test.ts"],
      availableTestIds: SEEDED_ALL_TEST_IDS,
      suitePathsByTestId,
      historicalDurationsMs: SEEDED_HISTORICAL_DURATIONS_MS,
      requestedAt: "2026-06-10T16:30:00.000Z",
    });

    assert.deepEqual(recommendation.recommendedTestIds, ["test-auth-session"]);
    assert.ok(recommendation.estimatedDurationMs < recommendation.fullSuiteDurationMs);
    assert.ok(recommendation.estimatedTimeSavingsMs > 0);
    assert.ok(recommendation.confidence > 0.5);
  });
});
