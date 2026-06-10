import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CI_TRIAGE_FIXTURES,
  loadFixtureLogs,
  padWithCiNoise,
} from "./test-helpers.js";
import {
  distillLog,
  meetsReductionTarget,
  retainsStageAttributedErrors,
} from "./log-distiller.js";

describe("log-distiller", () => {
  for (const fixture of CI_TRIAGE_FIXTURES) {
    it(`distills ${fixture.id} with >=90% reduction on padded logs`, () => {
      const { failedLog } = loadFixtureLogs(fixture);
      const padded = padWithCiNoise(failedLog, 500);
      const distilled = distillLog(padded, fixture.failedRun, fixture.failedRun.provider);

      assert.ok(meetsReductionTarget(distilled, 0.9));
      assert.ok(retainsStageAttributedErrors(distilled));
      assert.ok(
        distilled.lines.some((line) => line.stageId !== "unscoped"),
        "expected stage-attributed retained lines",
      );
    });
  }

  it("retains pytest failure lines for test-assertion fixture", () => {
    const fixture = CI_TRIAGE_FIXTURES.find((item) => item.id === "test-assertion")!;
    const { failedLog } = loadFixtureLogs(fixture);
    const distilled = distillLog(failedLog, fixture.failedRun, fixture.failedRun.provider);
    const joined = distilled.lines.map((line) => line.message).join("\n");

    assert.match(joined, /FAILED tests\/test_avatars\.py/);
    assert.match(joined, /assert 200 == 415/);
  });

  it("retains dependency timeout errors", () => {
    const fixture = CI_TRIAGE_FIXTURES.find((item) => item.id === "dependency-timeout")!;
    const { failedLog } = loadFixtureLogs(fixture);
    const distilled = distillLog(failedLog, fixture.failedRun, fixture.failedRun.provider);
    const joined = distilled.lines.map((line) => line.message).join("\n");

    assert.match(joined, /ETIMEDOUT/);
    assert.match(joined, /Install dependencies stage failed/);
  });
});
