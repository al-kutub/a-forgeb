import type { RunHistoryWindow, TestRunRecord } from "flake-radar/types/flake-radar";

const REPO_ID = "forgeb/demo";
const SINCE = "2026-06-01T00:00:00.000Z";
const UNTIL = "2026-06-10T00:00:00.000Z";

/** Three chronically flaky tests with mixed pass/fail outcomes and reruns. */
const FLAKY_TESTS = [
  { testId: "test-auth-session", testName: "auth session persistence", suitePath: "tests/auth/session.test.ts" },
  { testId: "test-checkout-race", testName: "checkout race condition", suitePath: "tests/checkout/concurrency.test.ts" },
  { testId: "test-api-timeout", testName: "upstream API timeout retry", suitePath: "tests/integration/upstream.test.ts" },
] as const;

/** Stable suite tests that always pass. */
const STABLE_TESTS = [
  { testId: "test-health", testName: "health endpoint", suitePath: "tests/api/health.test.ts" },
  { testId: "test-quote", testName: "quote endpoint", suitePath: "tests/api/quote.test.ts" },
  { testId: "test-user-model", testName: "user model validation", suitePath: "tests/models/user.test.ts" },
  { testId: "test-storage-local", testName: "local storage adapter", suitePath: "tests/storage/local.test.ts" },
  { testId: "test-storage-factory", testName: "storage factory", suitePath: "tests/storage/factory.test.ts" },
] as const;

function record(
  index: number,
  test: { testId: string; testName: string; suitePath: string },
  outcome: TestRunRecord["outcome"],
  attempt: number,
  durationMs: number,
): TestRunRecord {
  const day = String(1 + (index % 9)).padStart(2, "0");
  return {
    id: `run-${test.testId}-${index}`,
    repoId: REPO_ID,
    pipelineId: "ci-main",
    branch: "main",
    commitSha: `abc${index.toString(16).padStart(5, "0")}`,
    testId: test.testId,
    testName: test.testName,
    suitePath: test.suitePath,
    outcome,
    durationMs,
    attempt,
    ranAt: `2026-06-${day}T12:00:00.000Z`,
  };
}

/** Build 10-run windows: flaky tests flip outcomes; stable tests always pass. */
export function buildSeededRunHistory(): RunHistoryWindow {
  const runs: TestRunRecord[] = [];
  let index = 0;

  for (const flaky of FLAKY_TESTS) {
    const pattern: Array<{ outcome: TestRunRecord["outcome"]; attempt: number }> = [
      { outcome: "failed", attempt: 2 },
      { outcome: "passed", attempt: 1 },
      { outcome: "failed", attempt: 3 },
      { outcome: "passed", attempt: 1 },
      { outcome: "failed", attempt: 2 },
      { outcome: "passed", attempt: 1 },
      { outcome: "failed", attempt: 2 },
      { outcome: "passed", attempt: 1 },
      { outcome: "failed", attempt: 3 },
      { outcome: "passed", attempt: 1 },
    ];
    for (const entry of pattern) {
      runs.push(record(index++, flaky, entry.outcome, entry.attempt, 1200 + index * 10));
    }
  }

  for (const stable of STABLE_TESTS) {
    for (let i = 0; i < 10; i++) {
      runs.push(record(index++, stable, "passed", 1, 400 + index * 5));
    }
  }

  return { repoId: REPO_ID, since: SINCE, until: UNTIL, runs };
}

export const SEEDED_REPO_ID = REPO_ID;
export const SEEDED_FLAKY_TEST_IDS = FLAKY_TESTS.map((t) => t.testId);
export const SEEDED_STABLE_TEST_IDS = STABLE_TESTS.map((t) => t.testId);
export const SEEDED_ALL_TEST_IDS = [...SEEDED_FLAKY_TEST_IDS, ...SEEDED_STABLE_TEST_IDS];

/** Average per-test duration used by predictive selection fixtures. */
export const SEEDED_HISTORICAL_DURATIONS_MS: Record<string, number> = Object.fromEntries(
  [...FLAKY_TESTS, ...STABLE_TESTS].map((t, i) => [t.testId, 800 + i * 150]),
);
