import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CI_TRIAGE_FIXTURES, loadFixtureLogs } from "./test-helpers.js";
import { distillLog } from "./log-distiller.js";
import {
  diffAgainstGreenBaseline,
  normalizeLogMessage,
  onlyNovelAgainstGreen,
} from "./green-baseline-diff.js";

describe("green-baseline-diff", () => {
  for (const fixture of CI_TRIAGE_FIXTURES) {
    it(`emits only novel/changed lines for ${fixture.id}`, () => {
      const { failedLog, greenLog } = loadFixtureLogs(fixture);
      const failedDistilled = distillLog(
        failedLog,
        fixture.failedRun,
        fixture.failedRun.provider,
      );
      const greenDistilled = distillLog(
        greenLog,
        fixture.greenRun,
        fixture.greenRun.provider,
      );

      const diff = diffAgainstGreenBaseline(failedDistilled, greenDistilled);
      assert.ok(diff.novelLines.length > 0);
      assert.ok(onlyNovelAgainstGreen(diff, greenDistilled));

      const greenNormalized = new Set(
        greenDistilled.lines.map((line) =>
          normalizeLogMessage(`${line.stageId}:${line.message}`),
        ),
      );
      for (const line of diff.novelLines) {
        const candidate = normalizeLogMessage(`${line.stageId}:${line.message}`);
        assert.ok(!greenNormalized.has(candidate));
      }
    });
  }

  it("surfaces pytest assertion delta for test-assertion", () => {
    const fixture = CI_TRIAGE_FIXTURES.find((item) => item.id === "test-assertion")!;
    const { failedLog, greenLog } = loadFixtureLogs(fixture);
    const failedDistilled = distillLog(
      failedLog,
      fixture.failedRun,
      fixture.failedRun.provider,
    );
    const greenDistilled = distillLog(greenLog, fixture.greenRun, fixture.greenRun.provider);
    const diff = diffAgainstGreenBaseline(failedDistilled, greenDistilled);
    const joined = diff.novelLines.map((line) => line.message).join("\n");

    assert.match(joined, /FAILED tests\/test_avatars\.py/);
    assert.doesNotMatch(joined, /24 passed in/);
  });
});
