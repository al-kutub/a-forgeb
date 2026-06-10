import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CI_TRIAGE_FIXTURES, loadFixtureLogs } from "./test-helpers.js";
import { diffAgainstGreenBaseline } from "./green-baseline-diff.js";
import { distillLog } from "./log-distiller.js";
import {
  attributePrFiles,
  classificationMatchesExpected,
  classifyRootCause,
} from "./root-cause-classifier.js";

describe("root-cause-classifier", () => {
  for (const fixture of CI_TRIAGE_FIXTURES) {
    it(`classifies ${fixture.id} with confidence band and suggested actions`, () => {
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
      const baselineDiff = diffAgainstGreenBaseline(failedDistilled, greenDistilled);

      const summary = classifyRootCause({
        failed: failedDistilled,
        baselineDiff,
        changedFiles: fixture.changedFiles,
      });

      assert.ok(classificationMatchesExpected(summary, fixture.failureClass));
      assert.notEqual(summary.confidence, "unknown");
      assert.ok(summary.suggestedActions.length >= 2);
      assert.ok(summary.headline.length > 0);
      assert.ok(summary.narrative.length > 0);
      assert.equal(summary.comparedToGreenRun?.runId, fixture.greenRun.runId);
    });

    it(`attributes PR changed files for ${fixture.id}`, () => {
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
      const baselineDiff = diffAgainstGreenBaseline(failedDistilled, greenDistilled);
      const summary = classifyRootCause({
        failed: failedDistilled,
        baselineDiff,
        changedFiles: fixture.changedFiles,
      });

      assert.ok(summary.attributedFiles && summary.attributedFiles.length > 0);
      for (const path of summary.attributedFiles) {
        assert.ok(
          fixture.changedFiles.includes(path),
          `unexpected attribution ${path} for ${fixture.id}`,
        );
      }
    });
  }

  it("maps install stage failures to lockfile changes", () => {
    const fixture = CI_TRIAGE_FIXTURES.find((item) => item.id === "dependency-timeout")!;
    const { failedLog } = loadFixtureLogs(fixture);
    const failedDistilled = distillLog(
      failedLog,
      fixture.failedRun,
      fixture.failedRun.provider,
    );
    const failingStage = failedDistilled.stages.find((stage) => stage.status === "failure");

    const attributed = attributePrFiles(
      failingStage,
      "dependency_timeout",
      fixture.changedFiles,
      failedDistilled.lines.map((line) => line.message).join("\n"),
    );

    assert.deepEqual(attributed, ["package.json", "pnpm-lock.yaml"]);
  });

  it("maps test stage failures to test and source files", () => {
    const fixture = CI_TRIAGE_FIXTURES.find((item) => item.id === "test-assertion")!;
    const { failedLog } = loadFixtureLogs(fixture);
    const failedDistilled = distillLog(
      failedLog,
      fixture.failedRun,
      fixture.failedRun.provider,
    );
    const failingStage = failedDistilled.stages.find((stage) => stage.status === "failure");

    const attributed = attributePrFiles(
      failingStage,
      "test_assertion",
      fixture.changedFiles,
      failedDistilled.lines.map((line) => line.message).join("\n"),
    );

    assert.deepEqual(attributed, ["app/avatars.py", "tests/test_avatars.py"]);
  });

  it("keeps false-positive rate below 15% on seeded fixtures", () => {
    let mismatches = 0;
    for (const fixture of CI_TRIAGE_FIXTURES) {
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
      const baselineDiff = diffAgainstGreenBaseline(failedDistilled, greenDistilled);
      const summary = classifyRootCause({
        failed: failedDistilled,
        baselineDiff,
        changedFiles: fixture.changedFiles,
      });
      if (!classificationMatchesExpected(summary, fixture.failureClass)) {
        mismatches += 1;
      }
    }

    const falsePositiveRate = mismatches / CI_TRIAGE_FIXTURES.length;
    assert.ok(falsePositiveRate < 0.15, `false-positive rate ${falsePositiveRate} exceeded 15%`);
  });
});
