import type { DistilledLog, RootCauseSummary, RunRef } from "flake-radar/types/ci-triage";
import { diffAgainstGreenBaseline, type GreenBaselineDiff } from "../../services/ci-triage/green-baseline-diff.js";
import { distillLog } from "../../services/ci-triage/log-distiller.js";
import { classifyRootCause } from "../../services/ci-triage/root-cause-classifier.js";

export interface FailureLensTriageInput {
  failedLogText: string;
  greenLogText?: string;
  failedRun: RunRef;
  greenRun?: RunRef;
  changedFiles: string[];
}

export interface FailureLensTriageResult {
  distilled: DistilledLog;
  greenBaselineDiff?: GreenBaselineDiff;
  summary: RootCauseSummary;
}

export interface JsonResponse<T> {
  status: number;
  body: T;
}

export interface FailureLensRouteHandlers {
  triage(input: FailureLensTriageInput): JsonResponse<FailureLensTriageResult>;
}

/** Create REST-style handlers for Failure Lens CI triage. */
export function createFailureLensRoutes(): FailureLensRouteHandlers {
  return {
    triage(input) {
      if (!input.failedLogText.trim()) {
        return {
          status: 400,
          body: {
            distilled: {
              run: input.failedRun,
              stages: [],
              lines: [],
              originalLineCount: 0,
              distilledLineCount: 0,
              reductionRatio: 0,
            },
            summary: {
              failureClass: "unknown",
              confidence: "unknown",
              primaryStageId: "unscoped",
              headline: "Missing failed run log",
              narrative: "Triage requires the failed CI log payload.",
              suggestedActions: ["Attach the failed workflow log and retry triage."],
            },
          },
        };
      }

      const distilled = distillLog(
        input.failedLogText,
        input.failedRun,
        input.failedRun.provider,
      );

      let greenBaselineDiff: GreenBaselineDiff | undefined;
      if (input.greenLogText && input.greenRun) {
        const greenDistilled = distillLog(
          input.greenLogText,
          input.greenRun,
          input.greenRun.provider,
        );
        greenBaselineDiff = diffAgainstGreenBaseline(distilled, greenDistilled);
      }

      const summary = classifyRootCause({
        failed: distilled,
        baselineDiff: greenBaselineDiff,
        changedFiles: input.changedFiles,
      });

      return {
        status: 200,
        body: {
          distilled,
          greenBaselineDiff,
          summary,
        },
      };
    },
  };
}
