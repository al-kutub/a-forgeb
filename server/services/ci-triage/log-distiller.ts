import type {
  CIProvider,
  DistilledLog,
  DistilledLogLine,
  LogSeverity,
  RunRef,
} from "flake-radar/types/ci-triage";
import { parseLogLines, parseStages, stageIdForLine } from "./stage-parser.js";

const NOISE_PATTERNS: RegExp[] = [
  /^Syncing repository:/,
  /^Using Python /,
  /^Setup complete/,
  /^Lockfile is up to date/,
  /^Progress: resolved /,
  /^Packages: \+/,
  /^Done in \d/,
  /^Scope: \d+ of \d+ workspace projects/,
  /^Installing pnpm v/,
  /^All checks passed!/,
  /^\.\.+$/,
  /^\d+ passed in /,
  /^GET https:\/\/.* - pending$/,
  /^GET https:\/\/.* - 200$/,
  /^Pulling fs layer$/,
  /^Already exists$/,
  /^Retrying in \d+ seconds?$/,
  /^postgres Pulling$/,
  /^redis Pulling$/,
  /^\+ (pnpm install|pytest|ruff|docker compose|\.\/setup\.sh)/,
  /^##\[group\]/,
  /^##\[endgroup\]$/,
  /^Run actions\/checkout/,
  /^Run pnpm\/action-setup/,
  /^typecheck: Done$/,
];

const ERROR_PATTERNS: RegExp[] = [
  /^##\[error\]/,
  /^##\[warning\]/,
  /^npm ERR!/,
  /^E\s+assert /,
  /^FAILED /,
  /^FAILURES$/,
  /^=+ FAILURES =+$/,
  /^!+ stopping after/,
  /^=+ short test summary info =+$/,
  /ETIMEDOUT/,
  /ECONNRESET/,
  /stage failed/i,
  /Process completed with exit code [1-9]/,
  /assert \d+ == \d+/,
  /Error response from daemon/,
  /network request to .* failed/,
  /Install dependencies stage failed/,
  /Integration stage failed/,
  /in test_/,
  /^__+/,
  /\[100%\]$/,
  /\bF$/,
];

function classifySeverity(raw: string): LogSeverity {
  if (/^##\[error\]|^E\s|FAILED|FAILURES|ETIMEDOUT|ECONNRESET|Process completed with exit code [1-9]|stage failed/i.test(raw)) {
    return "error";
  }
  if (/^##\[warning\]|^npm ERR!/i.test(raw)) {
    return "warn";
  }
  return "info";
}

function isNoiseLine(raw: string): boolean {
  return NOISE_PATTERNS.some((pattern) => pattern.test(raw));
}

function isSignalLine(raw: string): boolean {
  if (isNoiseLine(raw)) {
    return false;
  }
  return ERROR_PATTERNS.some((pattern) => pattern.test(raw));
}

function buildContextWindow(signalLineNumbers: Set<number>, radius: number): Set<number> {
  const context = new Set<number>();
  for (const lineNumber of signalLineNumbers) {
    for (let offset = -radius; offset <= radius; offset += 1) {
      const candidate = lineNumber + offset;
      if (candidate > 0) {
        context.add(candidate);
      }
    }
  }
  return context;
}

/**
 * Distill a CI log down to stage-attributed error lines.
 * Retains signal lines plus minimal local context inside failing stages.
 */
export function distillLog(
  logText: string,
  run: RunRef,
  provider: CIProvider = "github-actions",
): DistilledLog {
  const lines = parseLogLines(logText);
  const stages = parseStages(logText, provider);
  const originalLineCount = lines.length;

  const signalLineNumbers = new Set<number>();
  for (const line of lines) {
    if (isSignalLine(line.raw)) {
      signalLineNumbers.add(line.lineNumber);
    }
  }

  const failingStageIds = new Set(
    stages.filter((stage) => stage.status === "failure").map((stage) => stage.id),
  );

  const contextWindow = buildContextWindow(signalLineNumbers, 1);
  const retained = new Set<number>();

  for (const line of lines) {
    const stageId = stageIdForLine(stages, line.lineNumber);
    const inFailingStage = failingStageIds.has(stageId);
    const isSignal = signalLineNumbers.has(line.lineNumber);
    const isContext = contextWindow.has(line.lineNumber) && inFailingStage;

    if (isSignal || (isContext && !isNoiseLine(line.raw))) {
      retained.add(line.lineNumber);
    }
  }

  const distilledLines: DistilledLogLine[] = lines
    .filter((line) => retained.has(line.lineNumber))
    .map((line) => ({
      lineNumber: line.lineNumber,
      stageId: stageIdForLine(stages, line.lineNumber),
      severity: classifySeverity(line.raw),
      message: line.raw,
      timestamp: line.timestamp,
    }));

  const distilledLineCount = distilledLines.length;
  const reductionRatio =
    originalLineCount === 0 ? 0 : (originalLineCount - distilledLineCount) / originalLineCount;

  return {
    run,
    stages,
    lines: distilledLines,
    originalLineCount,
    distilledLineCount,
    reductionRatio,
  };
}

/** Returns true when distillation removed at least the requested fraction of lines. */
export function meetsReductionTarget(distilled: DistilledLog, minimumRatio = 0.9): boolean {
  return distilled.reductionRatio >= minimumRatio;
}

/** Every retained line carries a stage id and at least one error-severity row exists. */
export function retainsStageAttributedErrors(distilled: DistilledLog): boolean {
  if (distilled.lines.length === 0) {
    return false;
  }
  const hasStageAttribution = distilled.lines.every((line) => line.stageId.length > 0);
  const hasError = distilled.lines.some((line) => line.severity === "error");
  return hasStageAttribution && hasError;
}
