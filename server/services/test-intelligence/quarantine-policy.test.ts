import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSeededRunHistory, SEEDED_FLAKY_TEST_IDS } from "../../fixtures/run-history.js";
import { rankFlakyTests } from "./flake-scorer.js";
import {
  blockingExcludedTestIds,
  evaluateQuarantinePolicy,
} from "./quarantine-policy.js";

describe("evaluateQuarantinePolicy", () => {
  it("auto-quarantines chronic flakes and excludes them from blocking with audit trail", () => {
    const ranking = rankFlakyTests({ window: buildSeededRunHistory() });
    const evaluatedAt = "2026-06-10T16:30:00.000Z";

    const result = evaluateQuarantinePolicy({
      scores: ranking.scores,
      existing: [],
      evaluatedAt,
    });

    assert.ok(result.newlyQuarantined.length >= 3);
    for (const flakyId of SEEDED_FLAKY_TEST_IDS) {
      const record = result.active.find((entry) => entry.testId === flakyId);
      assert.ok(record, `expected quarantine record for ${flakyId}`);
      assert.equal(record?.excludedFromBlocking, true);
      assert.equal(record?.reason, "chronic_flake");
      assert.ok(record?.auditNotes?.includes("Auto-quarantined"));
    }

    const excluded = blockingExcludedTestIds(result.active);
    assert.deepEqual(excluded.sort(), [...SEEDED_FLAKY_TEST_IDS].sort());
  });
});
