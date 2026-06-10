import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CI_TRIAGE_FIXTURES, loadFixtureLogs } from "./test-helpers.js";
import { parseStages } from "./stage-parser.js";

describe("stage-parser", () => {
  for (const fixture of CI_TRIAGE_FIXTURES) {
    it(`detects stage boundaries for ${fixture.id}`, () => {
      const { failedLog } = loadFixtureLogs(fixture);
      const stages = parseStages(failedLog, fixture.failedRun.provider);

      assert.ok(stages.length >= 2, "expected multiple stages");
      assert.ok(
        stages.every(
          (stage) =>
            stage.logStartLine !== undefined &&
            stage.logEndLine !== undefined &&
            stage.logEndLine >= stage.logStartLine,
        ),
      );

      const failing = stages.filter((stage) => stage.status === "failure");
      assert.ok(failing.length >= 1, "expected at least one failing stage");
    });
  }

  it("maps GitHub group markers to human-readable stage names", () => {
    const { failedLog } = loadFixtureLogs(CI_TRIAGE_FIXTURES[1]!);
    const stages = parseStages(failedLog, "github-actions");
    const names = stages.map((stage) => stage.name);
    assert.ok(names.some((name) => /Test/i.test(name)));
  });
});
