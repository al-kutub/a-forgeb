import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSeededRunHistory, SEEDED_REPO_ID } from "../../fixtures/run-history.js";
import { createFlakeRadarRoutes, createInMemoryFlakeRadarStore } from "./index.js";

describe("createFlakeRadarRoutes", () => {
  it("exposes scores, quarantine, and selection endpoints via handlers", () => {
    const history = buildSeededRunHistory();
    const store = createInMemoryFlakeRadarStore({ [SEEDED_REPO_ID]: history });
    const routes = createFlakeRadarRoutes(store);

    const scores = routes.getScores(SEEDED_REPO_ID);
    assert.equal(scores.status, 200);
    assert.ok(scores.body.scores.length >= 3);

    const quarantine = routes.evaluateQuarantine(SEEDED_REPO_ID);
    assert.equal(quarantine.status, 200);
    assert.ok(quarantine.body.newlyQuarantined.length >= 3);
    assert.ok(quarantine.body.auditLog.length >= 3);

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
    assert.ok(selection.body.estimatedTimeSavingsMs > 0);
  });
});
