import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CI_TRIAGE_FIXTURES, loadFixtureLogs } from "../../services/ci-triage/test-helpers.js";
import { createFailureLensRoutes } from "./index.js";

describe("createFailureLensRoutes", () => {
  const routes = createFailureLensRoutes();

  it("rejects triage without a failed log payload", () => {
    const fixture = CI_TRIAGE_FIXTURES[0]!;
    const response = routes.triage({
      failedLogText: "   ",
      failedRun: fixture.failedRun,
      changedFiles: fixture.changedFiles,
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.summary.failureClass, "unknown");
  });

  for (const fixture of CI_TRIAGE_FIXTURES) {
    it(`triage endpoint classifies ${fixture.id} and links stage to PR files`, () => {
      const { failedLog, greenLog } = loadFixtureLogs(fixture);
      const response = routes.triage({
        failedLogText: failedLog,
        greenLogText: greenLog,
        failedRun: fixture.failedRun,
        greenRun: fixture.greenRun,
        changedFiles: fixture.changedFiles,
      });

      assert.equal(response.status, 200);
      assert.equal(response.body.summary.failureClass, fixture.failureClass);
      assert.notEqual(response.body.summary.confidence, "unknown");
      assert.ok(response.body.summary.suggestedActions.length >= 2);
      assert.ok(response.body.greenBaselineDiff);
      assert.ok(response.body.greenBaselineDiff!.novelLines.length > 0);

      const failingStage = response.body.distilled.stages.find((stage) => stage.status === "failure");
      assert.ok(failingStage, `expected failing stage for ${fixture.id}`);
      assert.equal(response.body.summary.primaryStageId, failingStage!.id);

      assert.ok(response.body.summary.attributedFiles && response.body.summary.attributedFiles.length > 0);
      for (const path of response.body.summary.attributedFiles!) {
        assert.ok(fixture.changedFiles.includes(path));
      }
    });
  }
});
