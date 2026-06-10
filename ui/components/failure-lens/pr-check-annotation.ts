import type {
  ConfidenceBand,
  DistilledLog,
  FailureClass,
  RootCauseSummary,
} from "flake-radar/types/ci-triage";

/** GitHub Actions check-run annotation level. */
export type PrCheckAnnotationLevel = "notice" | "warning" | "failure";

/** Single file annotation attached to a PR check run. */
export interface PrCheckFileAnnotation {
  path: string;
  startLine: number;
  endLine: number;
  annotationLevel: PrCheckAnnotationLevel;
  title: string;
  message: string;
}

/**
 * Payload shape for surfacing Failure Lens triage in PR check output.
 * Compatible with GitHub Actions `actions/create-check-run` output fields.
 */
export interface PrCheckAnnotationPayload {
  title: string;
  summary: string;
  text: string;
  confidence: ConfidenceBand;
  failureClass: FailureClass;
  primaryStageId: string;
  suggestedAction: string;
  annotations: PrCheckFileAnnotation[];
}

const CONFIDENCE_LABEL: Record<ConfidenceBand, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
  unknown: "Unknown confidence",
};

function confidenceToLevel(confidence: ConfidenceBand): PrCheckAnnotationLevel {
  if (confidence === "high" || confidence === "medium") {
    return "failure";
  }
  if (confidence === "low") {
    return "warning";
  }
  return "notice";
}

export function formatPrCheckSummary(summary: RootCauseSummary): string {
  const lines = [
    `**${summary.headline}**`,
    "",
    summary.narrative,
    "",
    `Confidence: **${CONFIDENCE_LABEL[summary.confidence]}** · Class: \`${summary.failureClass}\``,
  ];

  if (summary.attributedFiles && summary.attributedFiles.length > 0) {
    lines.push("", "**PR files in scope:**", ...summary.attributedFiles.map((path) => `- \`${path}\``));
  }

  if (summary.comparedToGreenRun) {
    lines.push(
      "",
      `Compared to last green run [\`${summary.comparedToGreenRun.runId}\`](${summary.comparedToGreenRun.url ?? "#"}) on \`${summary.comparedToGreenRun.branch}\`.`,
    );
  }

  return lines.join("\n");
}

/** Map triage output to PR check annotation payload. */
export function buildPrCheckAnnotationPayload(
  summary: RootCauseSummary,
  distilled: DistilledLog,
): PrCheckAnnotationPayload {
  const suggestedAction = summary.suggestedActions[0] ?? "Review the failing stage timeline.";
  const primaryStage = distilled.stages.find((stage) => stage.id === summary.primaryStageId);
  const errorLines = distilled.lines.filter(
    (line) =>
      line.stageId === summary.primaryStageId &&
      (line.severity === "error" || line.severity === "warn"),
  );

  const annotations: PrCheckFileAnnotation[] = [];

  for (const path of summary.attributedFiles ?? []) {
    annotations.push({
      path,
      startLine: 1,
      endLine: 1,
      annotationLevel: confidenceToLevel(summary.confidence),
      title: summary.headline,
      message: suggestedAction,
    });
  }

  if (annotations.length === 0 && errorLines.length > 0) {
    annotations.push({
      path: "ci.log",
      startLine: errorLines[0]!.lineNumber,
      endLine: errorLines[errorLines.length - 1]!.lineNumber,
      annotationLevel: confidenceToLevel(summary.confidence),
      title: primaryStage ? `${primaryStage.name} failed` : summary.headline,
      message: errorLines[0]!.message.slice(0, 500),
    });
  }

  const textLines = [
    "## Suggested next action",
    suggestedAction,
    "",
    "## All suggested actions",
    ...summary.suggestedActions.map((action, index) => `${index + 1}. ${action}`),
  ];

  if (errorLines.length > 0) {
    textLines.push("", "## Distilled errors", ...errorLines.slice(0, 8).map((line) => `- ${line.message}`));
  }

  return {
    title: summary.headline,
    summary: formatPrCheckSummary(summary),
    text: textLines.join("\n"),
    confidence: summary.confidence,
    failureClass: summary.failureClass,
    primaryStageId: summary.primaryStageId,
    suggestedAction,
    annotations,
  };
}
