import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSeededRunHistory,
  SEEDED_FLAKY_TEST_IDS,
  SEEDED_STABLE_TEST_IDS,
} from "../../fixtures/run-history.js";
import { rankFlakyTests } from "./flake-scorer.js";

describe("rankFlakyTests", () => {
  it("ranks three seeded flaky tests above the stable suite", () => {
    const ranking = rankFlakyTests({ window: buildSeededRunHistory() });

    assert.equal(ranking.scores.length, 8);

    const topThree = ranking.scores.slice(0, 3).map((score) => score.testId);
    for (const flakyId of SEEDED_FLAKY_TEST_IDS) {
      assert.ok(topThree.includes(flakyId), `expected flaky test ${flakyId} in top 3`);
    }

    const stableIds = new Set<string>(SEEDED_STABLE_TEST_IDS);
    const stableScores = ranking.scores.filter((score) => stableIds.has(score.testId));
    assert.ok(stableScores.every((score) => score.score < ranking.scores[2].score));
    assert.ok(stableScores.every((score) => score.failRate === 0));
  });
});
