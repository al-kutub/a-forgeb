import type { CIProvider, Stage, StageStatus } from "flake-radar/types/ci-triage";

/** One raw log line with optional CI timestamp prefix. */
export interface RawLogLine {
  lineNumber: number;
  raw: string;
  timestamp?: string;
}

const ISO_PREFIX = /^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+(.*)$/;

const STAGE_PATTERNS: Record<
  CIProvider,
  { start: RegExp; end: RegExp; nameFromStart: (match: RegExpMatchArray) => string }
> = {
  "github-actions": {
    start: /^##\[group\](.+)$/,
    end: /^##\[endgroup\]$/,
    nameFromStart: (match) => match[1]!.trim(),
  },
  "gitlab-ci": {
    start: /^section_start:\d+:[^\s]+\r?\n?\u001b\[0K(.+)$/,
    end: /^section_end:\d+:[^\s]+$/,
    nameFromStart: (match) => match[1]!.trim(),
  },
  jenkins: {
    start: /^\[Pipeline\]\s+\{\s*\((.+)\)$/,
    end: /^\[Pipeline\]\s+\/\s*\/.+$/,
    nameFromStart: (match) => match[1]!.trim(),
  },
};

function slugifyStageName(name: string, order: number): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug.length > 0 ? `${slug}-${order}` : `stage-${order}`;
}

function splitLogLines(logText: string): RawLogLine[] {
  const lines = logText.replace(/\r\n/g, "\n").split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines.map((raw, index) => {
    const lineNumber = index + 1;
    const match = raw.match(ISO_PREFIX);
    if (match) {
      return { lineNumber, timestamp: match[1], raw: match[2]! };
    }
    return { lineNumber, raw };
  });
}

function inferStageStatus(
  stageLines: RawLogLine[],
  isLastStage: boolean,
  logHasFailure: boolean,
): StageStatus {
  const joined = stageLines.map((line) => line.raw).join("\n");
  if (/##\[error\]|stage failed|Process completed with exit code [1-9]/i.test(joined)) {
    return "failure";
  }
  if (/##\[warning\]/i.test(joined) && isLastStage && logHasFailure) {
    return "failure";
  }
  if (logHasFailure && isLastStage) {
    return "failure";
  }
  return "success";
}

/** Split a log stream into numbered raw lines. */
export function parseLogLines(logText: string): RawLogLine[] {
  return splitLogLines(logText);
}

/** Parse stage boundaries and attach 1-based log line ranges to each stage. */
export function parseStages(logText: string, provider: CIProvider = "github-actions"): Stage[] {
  const lines = splitLogLines(logText);
  const patterns = STAGE_PATTERNS[provider];
  const stages: Stage[] = [];
  const openStages: Array<{ stage: Stage; startLine: number }> = [];
  let order = 0;

  const closeStage = (endLine: number) => {
    const open = openStages.pop();
    if (!open) {
      return;
    }
    open.stage.logEndLine = endLine;
    open.stage.finishedAt = lines[endLine - 1]?.timestamp;
    stages.push(open.stage);
  };

  for (const line of lines) {
    const startMatch = line.raw.match(patterns.start);
    if (startMatch) {
      order += 1;
      const name = patterns.nameFromStart(startMatch);
      const stage: Stage = {
        id: slugifyStageName(name, order),
        name,
        order,
        status: "running",
        startedAt: line.timestamp,
        logStartLine: line.lineNumber,
      };
      openStages.push({ stage, startLine: line.lineNumber });
      continue;
    }

    if (patterns.end.test(line.raw)) {
      closeStage(line.lineNumber);
    }
  }

  while (openStages.length > 0) {
    closeStage(lines.length > 0 ? lines.length : 1);
  }

  const logHasFailure = /##\[error\]|FAILED|FAILURES|ETIMEDOUT|ECONNRESET|stage failed/i.test(
    logText,
  );

  return stages.map((stage, index) => ({
    ...stage,
    status: inferStageStatus(
      lines.filter(
        (line) =>
          stage.logStartLine !== undefined &&
          stage.logEndLine !== undefined &&
          line.lineNumber >= stage.logStartLine &&
          line.lineNumber <= stage.logEndLine,
      ),
      index === stages.length - 1,
      logHasFailure,
    ),
  }));
}

/** Resolve the stage id owning a 1-based log line number. */
export function stageIdForLine(stages: Stage[], lineNumber: number): string {
  for (const stage of stages) {
    if (
      stage.logStartLine !== undefined &&
      stage.logEndLine !== undefined &&
      lineNumber >= stage.logStartLine &&
      lineNumber <= stage.logEndLine
    ) {
      return stage.id;
    }
  }
  return "unscoped";
}
