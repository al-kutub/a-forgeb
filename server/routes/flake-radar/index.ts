import type {
  FlakeScoreRanking,
  FlakeScoringInput,
  PredictiveSelectionInput,
  QuarantinePolicyInput,
  QuarantinePolicyResult,
  QuarantineRecord,
  RunHistoryWindow,
  SelectionRecommendation,
} from "flake-radar/types/flake-radar";
import { rankFlakyTests } from "../../services/test-intelligence/flake-scorer.js";
import {
  blockingExcludedTestIds,
  evaluateQuarantinePolicy,
} from "../../services/test-intelligence/quarantine-policy.js";
import { recommendTestSubset } from "../../services/test-intelligence/predictive-selection.js";

export interface FlakeRadarStore {
  getRunHistory(repoId: string): RunHistoryWindow | undefined;
  getQuarantine(repoId: string): QuarantineRecord[];
  setQuarantine(repoId: string, records: QuarantineRecord[]): void;
}

export interface JsonResponse<T> {
  status: number;
  body: T;
}

export interface FlakeRadarRouteHandlers {
  getScores(repoId: string, input?: Partial<FlakeScoringInput>): JsonResponse<FlakeScoreRanking>;
  evaluateQuarantine(
    repoId: string,
    input?: Partial<QuarantinePolicyInput>,
  ): JsonResponse<QuarantinePolicyResult & { auditLog: string[] }>;
  getQuarantine(repoId: string): JsonResponse<{ active: QuarantineRecord[]; excludedFromBlocking: string[] }>;
  recommendSelection(input: PredictiveSelectionInput): JsonResponse<SelectionRecommendation>;
}

function suitePathsFromHistory(window: RunHistoryWindow): Record<string, string> {
  const paths: Record<string, string> = {};
  for (const run of window.runs) {
    if (run.suitePath) {
      paths[run.testId] = run.suitePath;
    }
  }
  return paths;
}

function uniqueTestIds(window: RunHistoryWindow): string[] {
  return [...new Set(window.runs.map((run) => run.testId))];
}

function averageDurations(window: RunHistoryWindow): Record<string, number> {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const run of window.runs) {
    const entry = totals.get(run.testId) ?? { sum: 0, count: 0 };
    entry.sum += run.durationMs;
    entry.count += 1;
    totals.set(run.testId, entry);
  }
  return Object.fromEntries(
    [...totals.entries()].map(([testId, entry]) => [testId, Math.round(entry.sum / entry.count)]),
  );
}

/** Create REST-style handlers for flake radar scores, quarantine, and selection. */
export function createFlakeRadarRoutes(store: FlakeRadarStore): FlakeRadarRouteHandlers {
  return {
    getScores(repoId, input = {}) {
      const window = input.window ?? store.getRunHistory(repoId);
      if (!window) {
        return {
          status: 404,
          body: {
            repoId,
            scores: [],
            generatedAt: new Date().toISOString(),
          },
        };
      }

      const ranking = rankFlakyTests({
        window,
        minSampleSize: input.minSampleSize,
      });
      return { status: 200, body: ranking };
    },

    evaluateQuarantine(repoId, input = {}) {
      const window = store.getRunHistory(repoId);
      if (!window) {
        return {
          status: 404,
          body: {
            newlyQuarantined: [],
            active: [],
            released: [],
            auditLog: [`No run history found for repo ${repoId}`],
          },
        };
      }

      const scores =
        input.scores ??
        rankFlakyTests({
          window,
        }).scores;
      const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
      const result = evaluateQuarantinePolicy({
        scores,
        existing: input.existing ?? store.getQuarantine(repoId),
        scoreThreshold: input.scoreThreshold,
        evaluatedAt,
      });

      store.setQuarantine(repoId, result.active);

      const auditLog = [
        ...result.newlyQuarantined.map((record) => record.auditNotes ?? record.testId),
        ...result.active.map(
          (record) =>
            `Active quarantine: ${record.testName} (${record.testId}) — excluded from blocking=${record.excludedFromBlocking}`,
        ),
      ];

      return { status: 200, body: { ...result, auditLog } };
    },

    getQuarantine(repoId) {
      const active = store.getQuarantine(repoId).filter((record) => record.status === "active");
      return {
        status: 200,
        body: {
          active,
          excludedFromBlocking: blockingExcludedTestIds(active),
        },
      };
    },

    recommendSelection(input) {
      const window = store.getRunHistory(input.repoId);
      const suitePathsByTestId =
        input.suitePathsByTestId ?? (window ? suitePathsFromHistory(window) : undefined);
      const availableTestIds =
        input.availableTestIds.length > 0
          ? input.availableTestIds
          : window
            ? uniqueTestIds(window)
            : [];
      const historicalDurationsMs =
        Object.keys(input.historicalDurationsMs).length > 0
          ? input.historicalDurationsMs
          : window
            ? averageDurations(window)
            : {};

      const recommendation = recommendTestSubset({
        ...input,
        availableTestIds,
        suitePathsByTestId,
        historicalDurationsMs,
        requestedAt: input.requestedAt ?? new Date().toISOString(),
      });

      return { status: 200, body: recommendation };
    },
  };
}

/** In-memory store for local development and tests. */
export function createInMemoryFlakeRadarStore(
  histories: Record<string, RunHistoryWindow> = {},
  quarantine: Record<string, QuarantineRecord[]> = {},
): FlakeRadarStore {
  const historyState = { ...histories };
  const quarantineState = { ...quarantine };

  return {
    getRunHistory(repoId) {
      return historyState[repoId];
    },
    getQuarantine(repoId) {
      return quarantineState[repoId] ?? [];
    },
    setQuarantine(repoId, records) {
      quarantineState[repoId] = records;
    },
  };
}
