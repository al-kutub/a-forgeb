import type { DistilledLog, DistilledLogLine, RunRef } from "flake-radar/types/ci-triage";

export type BaselineDiffChangeKind = "added" | "changed";

/** A failed-run line that is absent or changed relative to the green baseline. */
export interface BaselineDiffLine extends DistilledLogLine {
  changeKind: BaselineDiffChangeKind;
  baselineMessage?: string;
}

export interface GreenBaselineDiff {
  failedRun: RunRef;
  greenRun: RunRef;
  novelLines: BaselineDiffLine[];
}

const ISO_PREFIX = /^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+(.*)$/;

/** Strip CI timestamps so green/failed lines can be compared by semantic content. */
export function normalizeLogMessage(message: string): string {
  const withoutTimestamp = message.replace(ISO_PREFIX, "$2");
  return withoutTimestamp.replace(/\s+/g, " ").trim();
}

function stageMessageKey(stageId: string, message: string): string {
  return `${stageId}::${normalizeLogMessage(message)}`;
}

function indexGreenLines(green: DistilledLog): Map<string, DistilledLogLine> {
  const index = new Map<string, DistilledLogLine>();
  for (const line of green.lines) {
    index.set(stageMessageKey(line.stageId, line.message), line);
  }
  return index;
}

function linesByStage(lines: DistilledLogLine[]): Map<string, DistilledLogLine[]> {
  const grouped = new Map<string, DistilledLogLine[]>();
  for (const line of lines) {
    const bucket = grouped.get(line.stageId) ?? [];
    bucket.push(line);
    grouped.set(line.stageId, bucket);
  }
  return grouped;
}

/**
 * Diff a failed distilled log against the last green baseline on the same branch.
 * Emits only lines absent from the baseline or changed within the same stage.
 */
export function diffAgainstGreenBaseline(
  failed: DistilledLog,
  green: DistilledLog,
): GreenBaselineDiff {
  const greenIndex = indexGreenLines(green);
  const greenByStage = linesByStage(green.lines);
  const novelLines: BaselineDiffLine[] = [];

  for (const failedLine of failed.lines) {
    const key = stageMessageKey(failedLine.stageId, failedLine.message);
    const exactMatch = greenIndex.get(key);
    if (exactMatch) {
      continue;
    }

    const normalizedFailed = normalizeLogMessage(failedLine.message);
    const stagePeers = greenByStage.get(failedLine.stageId) ?? [];
    const fuzzyMatch = stagePeers.find((peer) => {
      const normalizedPeer = normalizeLogMessage(peer.message);
      return (
        normalizedPeer.length > 0 &&
        normalizedFailed.length > 0 &&
        (normalizedPeer.startsWith(normalizedFailed.slice(0, 24)) ||
          normalizedFailed.startsWith(normalizedPeer.slice(0, 24)))
      );
    });

    if (fuzzyMatch && normalizeLogMessage(fuzzyMatch.message) !== normalizedFailed) {
      novelLines.push({
        ...failedLine,
        changeKind: "changed",
        baselineMessage: fuzzyMatch.message,
      });
      continue;
    }

    novelLines.push({
      ...failedLine,
      changeKind: "added",
    });
  }

  return {
    failedRun: failed.run,
    greenRun: green.run,
    novelLines,
  };
}

/** True when every emitted diff line is absent from the green baseline content set. */
export function onlyNovelAgainstGreen(
  diff: GreenBaselineDiff,
  green: DistilledLog,
): boolean {
  const greenMessages = new Set(
    green.lines.map((line) => stageMessageKey(line.stageId, line.message)),
  );
  return diff.novelLines.every((line) => {
    const key = stageMessageKey(line.stageId, line.message);
    if (greenMessages.has(key)) {
      return false;
    }
    if (line.changeKind === "changed" && line.baselineMessage) {
      return normalizeLogMessage(line.message) !== normalizeLogMessage(line.baselineMessage);
    }
    return true;
  });
}
