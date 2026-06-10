import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSeededRunHistory,
  SEEDED_FLAKY_TEST_IDS,
  SEEDED_REPO_ID,
  SEEDED_STABLE_TEST_IDS,
} from "../../fixtures/run-history.js";
import { createFlakeRadarRoutes, createInMemoryFlakeRadarStore } from "./index.js";

/** End-to-end acceptance checks for Flake Radar seeded fixture + route handlers. */
describe("Flake Radar acceptance (integration)", () => {
  const history = buildSeededRunHistory();
  const store = createInMemoryFlakeRadarStore({ [SEEDED_REPO_ID]: history });
  const routes = createFlakeRadarRoutes(store);

  it("seeds 3 flaky tests and a stable suite run history", () => {
    const flakyIds = new Set(
      history.runs.filter((run) => run.outcome !== "passed").map((run) => run.testId),
    );
    assert.equal(flakyIds.size, 3);
    for (const flakyId of SEEDED_FLAKY_TEST_IDS) {
      assert.ok(flakyIds.has(flakyId));
    }

    const stableRuns = history.runs.filter((run) =>
      SEEDED_STABLE_TEST_IDS.includes(run.testId as (typeof SEEDED_STABLE_TEST_IDS)[number]),
    );
    assert.ok(stableRuns.length >= 10);
    assert.ok(stableRuns.every((run) => run.outcome === "passed" && run.attempt === 1));
  });

  it("ranks instability and surfaces top offenders per repo", () => {
    const scores = routes.getScores(SEEDED_REPO_ID);
    assert.equal(scores.status, 200);
    assert.equal(scores.body.repoId, SEEDED_REPO_ID);
    assert.ok(scores.body.scores.length >= 3);

    const topThree = scores.body.scores.slice(0, 3).map((score) => score.testId);
    for (const flakyId of SEEDED_FLAKY_TEST_IDS) {
      assert.ok(topThree.includes(flakyId), `expected ${flakyId} in top offenders`);
    }
  });

  it("auto-quarantines chronic flakes with blocking exclusion and audit trail", () => {
    const quarantine = routes.evaluateQuarantine(SEEDED_REPO_ID);
    assert.equal(quarantine.status, 200);
    assert.ok(quarantine.body.newlyQuarantined.length >= 3);
    assert.ok(quarantine.body.auditLog.length >= 3);

    for (const flakyId of SEEDED_FLAKY_TEST_IDS) {
      const record = quarantine.body.active.find((entry) => entry.testId === flakyId);
      assert.ok(record);
      assert.equal(record?.excludedFromBlocking, true);
      assert.ok(record?.auditNotes?.includes("Auto-quarantined"));
    }

    const active = routes.getQuarantine(SEEDED_REPO_ID);
    assert.deepEqual(active.body.excludedFromBlocking.sort(), [...SEEDED_FLAKY_TEST_IDS].sort());
  });

  it("recommends a minimal predictive subset with time savings", () => {
    const selection = routes.recommendSelection({
      repoId: SEEDED_REPO_ID,
      branch: "feature/auth-fix",
      commitSha: "abc123",
      changedPaths: ["tests/auth/session.test.ts"],
      availableTestIds: [],
      historicalDurationsMs: {},
      requestedAt: "2026-06-10T16:30:00.000Z",
    });

    assert.equal(selection.status, 200);
    assert.deepEqual(selection.body.recommendedTestIds, ["test-auth-session"]);
    assert.ok(selection.body.estimatedTimeSavingsMs > 0);
    assert.ok(selection.body.estimatedDurationMs < selection.body.fullSuiteDurationMs);
  });
});
