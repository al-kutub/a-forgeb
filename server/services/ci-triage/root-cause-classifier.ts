import type {
  ConfidenceBand,
  DistilledLog,
  FailureClass,
  RootCauseSummary,
  Stage,
} from "flake-radar/types/ci-triage";
import type { GreenBaselineDiff } from "./green-baseline-diff.js";

export interface ClassifyRootCauseInput {
  failed: DistilledLog;
  baselineDiff?: GreenBaselineDiff;
  changedFiles?: string[];
}

interface FailureClassRule {
  failureClass: FailureClass;
  patterns: RegExp[];
  headline: string;
  narrative: string;
  suggestedActions: string[];
  stageNameHints: RegExp[];
  filePatterns: RegExp[];
}

const FAILURE_CLASS_RULES: FailureClassRule[] = [
  {
    failureClass: "dependency_timeout",
    patterns: [/ETIMEDOUT/i, /Install dependencies stage failed/i, /network request to .* failed/i],
    headline: "Dependency install timed out",
    narrative:
      "The install-dependencies stage exceeded its timeout while fetching packages from a remote registry.",
    suggestedActions: [
      "Verify registry connectivity and credentials for private packages.",
      "Review lockfile and package.json changes in this PR for new or bumped dependencies.",
      "Retry the pipeline once registry health is confirmed.",
    ],
    stageNameHints: [/install/i, /dependenc/i],
    filePatterns: [/package\.json$/i, /pnpm-lock\.yaml$/i, /package-lock\.json$/i, /yarn\.lock$/i],
  },
  {
    failureClass: "test_assertion",
    patterns: [
      /FAILED tests?\//i,
      /assert \d+ == \d+/,
      /short test summary info/i,
      /stopping after \d+ failures/i,
    ],
    headline: "Test assertion failed",
    narrative:
      "A unit or integration test assertion failed in the test stage after code changes in this PR.",
    suggestedActions: [
      "Open the failing test output and compare expected vs actual values.",
      "Trace the failure to recently changed source files referenced in the stack trace.",
      "Update the implementation or adjust the test expectation before re-running CI.",
    ],
    stageNameHints: [/test/i, /pytest/i],
    filePatterns: [/^tests?\//i, /^app\//i, /\.test\.[jt]sx?$/i, /_test\.go$/i],
  },
  {
    failureClass: "infra_flake",
    patterns: [
      /ECONNRESET/i,
      /docker pull interrupted/i,
      /Integration stage failed/i,
      /Error response from daemon/i,
      /registry connectivity/i,
    ],
    headline: "Infrastructure flake during integration",
    narrative:
      "An integration-stage docker or registry pull failed with transient connectivity errors unrelated to application logic.",
    suggestedActions: [
      "Re-run the pipeline — the same commit may already have a recent green baseline.",
      "Check container registry and runner network status before escalating.",
      "Only investigate PR file changes if flakes persist across multiple retries.",
    ],
    stageNameHints: [/integration/i, /docker/i],
    filePatterns: [/docker-compose/i, /Dockerfile/i],
  },
  {
    failureClass: "build_compile",
    patterns: [/TS\d{4}:/, /error: expected/i, /compilation failed/i, /cannot find module/i],
    headline: "Build or compile error",
    narrative: "The build stage reported compiler or bundler errors after recent code changes.",
    suggestedActions: [
      "Run the local typecheck/build command for the failing package.",
      "Fix compile errors in files changed by this PR.",
      "Re-run CI after the build passes locally.",
    ],
    stageNameHints: [/build/i, /compile/i, /typecheck/i],
    filePatterns: [/\.tsx?$/i, /\.jsx?$/i, /\.go$/i, /\.rs$/i],
  },
];

function joinedMessages(distilled: DistilledLog, baselineDiff?: GreenBaselineDiff): string {
  const lines =
    baselineDiff && baselineDiff.novelLines.length > 0
      ? baselineDiff.novelLines.map((line) => line.message)
      : distilled.lines.map((line) => line.message);
  return lines.join("\n");
}

function scoreRule(rule: FailureClassRule, corpus: string): number {
  return rule.patterns.reduce((score, pattern) => (pattern.test(corpus) ? score + 1 : score), 0);
}

function pickFailureClass(corpus: string): { rule: FailureClassRule | null; score: number } {
  let best: FailureClassRule | null = null;
  let bestScore = 0;

  for (const rule of FAILURE_CLASS_RULES) {
    const score = scoreRule(rule, corpus);
    if (score > bestScore) {
      best = rule;
      bestScore = score;
    }
  }

  return { rule: best, score: bestScore };
}

function primaryFailingStage(stages: Stage[]): Stage | undefined {
  return stages
    .filter((stage) => stage.status === "failure")
    .sort((left, right) => left.order - right.order)[0];
}

function pathsMentionedInCorpus(corpus: string): string[] {
  const matches = corpus.match(/(?:tests?\/|app\/|src\/|packages\/)[^\s:'"]+/g) ?? [];
  return [...new Set(matches.map((path) => path.replace(/[),.;]+$/, "")))];
}

/** Map a failing stage and failure class to PR changed files. */
export function attributePrFiles(
  primaryStage: Stage | undefined,
  failureClass: FailureClass,
  changedFiles: string[],
  corpus: string,
): string[] {
  if (changedFiles.length === 0) {
    return [];
  }

  const rule = FAILURE_CLASS_RULES.find((entry) => entry.failureClass === failureClass);
  const mentionedPaths = pathsMentionedInCorpus(corpus);
  const attributed = new Set<string>();

  for (const path of changedFiles) {
    if (mentionedPaths.some((mention) => path === mention || path.endsWith(mention))) {
      attributed.add(path);
    }
  }

  if (rule) {
    for (const path of changedFiles) {
      if (rule.filePatterns.some((pattern) => pattern.test(path))) {
        attributed.add(path);
      }
    }
  }

  if (primaryStage && rule) {
    const stageMatches = rule.stageNameHints.some((hint) => hint.test(primaryStage.name));
    if (stageMatches) {
      for (const path of changedFiles) {
        if (rule.filePatterns.some((pattern) => pattern.test(path))) {
          attributed.add(path);
        }
      }
    }
  }

  if (attributed.size === 0 && primaryStage) {
    const stageHint = FAILURE_CLASS_RULES.find((entry) =>
      entry.stageNameHints.some((hint) => hint.test(primaryStage.name)),
    );
    if (stageHint) {
      for (const path of changedFiles) {
        if (stageHint.filePatterns.some((pattern) => pattern.test(path))) {
          attributed.add(path);
        }
      }
    }
  }

  return [...attributed].sort();
}

function confidenceBand(
  score: number,
  primaryStage: Stage | undefined,
  attributedFiles: string[],
  changedFiles: string[],
): ConfidenceBand {
  if (score === 0 || !primaryStage) {
    return "unknown";
  }
  if (score >= 2 && attributedFiles.length > 0) {
    return "high";
  }
  if (score >= 2 || (score >= 1 && changedFiles.length > 0)) {
    return "medium";
  }
  if (score >= 1) {
    return "low";
  }
  return "unknown";
}

/**
 * Deterministic root-cause classifier over distilled logs and optional green-baseline diff.
 * Surfaces confidence band, narrative, suggested actions, and PR file attribution.
 */
export function classifyRootCause(input: ClassifyRootCauseInput): RootCauseSummary {
  const { failed, baselineDiff, changedFiles = [] } = input;
  const corpus = joinedMessages(failed, baselineDiff);
  const { rule, score } = pickFailureClass(corpus);
  const primaryStage = primaryFailingStage(failed.stages);
  const failureClass = rule?.failureClass ?? "unknown";
  const attributedFiles = attributePrFiles(primaryStage, failureClass, changedFiles, corpus);
  const confidence = confidenceBand(score, primaryStage, attributedFiles, changedFiles);

  if (!rule || score === 0) {
    return {
      failureClass: "unknown",
      confidence: "unknown",
      primaryStageId: primaryStage?.id ?? "unscoped",
      headline: "CI failure needs manual triage",
      narrative:
        "Automated classification could not match a known failure class from the distilled error lines.",
      suggestedActions: [
        "Inspect the failing stage timeline and distilled error lines.",
        "Compare against the last green run on the same branch.",
        "Escalate with the raw log if the failure pattern is new.",
      ],
      attributedFiles: attributedFiles.length > 0 ? attributedFiles : undefined,
      comparedToGreenRun: baselineDiff?.greenRun,
    };
  }

  return {
    failureClass: rule.failureClass,
    confidence,
    primaryStageId: primaryStage?.id ?? "unscoped",
    headline: rule.headline,
    narrative: rule.narrative,
    suggestedActions: rule.suggestedActions,
    attributedFiles: attributedFiles.length > 0 ? attributedFiles : undefined,
    comparedToGreenRun: baselineDiff?.greenRun,
  };
}

/** Returns true when predicted class matches the fixture's known failure class. */
export function classificationMatchesExpected(
  summary: RootCauseSummary,
  expected: FailureClass,
): boolean {
  return summary.failureClass === expected;
}
