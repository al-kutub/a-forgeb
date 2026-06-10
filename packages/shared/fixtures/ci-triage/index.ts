import type { CITriageFixture } from "../../types/ci-triage.js";

/** Paths are relative to `packages/shared/fixtures/ci-triage/`. */
function fixturePath(...segments: string[]): string {
  return segments.join("/");
}

/** Seeded CI log fixtures with paired last-green baselines. */
export const CI_TRIAGE_FIXTURES: readonly CITriageFixture[] = [
  {
    id: "dependency-timeout",
    failureClass: "dependency_timeout",
    description:
      "npm install stage times out fetching a private registry tarball on a feature branch.",
    failedRun: {
      provider: "github-actions",
      runId: "18492031",
      pipelineId: "ci-pr",
      branch: "feat/cache-invalidation",
      commitSha: "a1b2c3d4e5f6",
      prNumber: 412,
      status: "failure",
      url: "https://github.com/al-kutub/a-forgeb/actions/runs/18492031",
      triggeredAt: "2026-06-10T14:22:11Z",
    },
    greenRun: {
      provider: "github-actions",
      runId: "18491802",
      pipelineId: "ci-pr",
      branch: "feat/cache-invalidation",
      commitSha: "9f8e7d6c5b4a",
      prNumber: 412,
      status: "success",
      url: "https://github.com/al-kutub/a-forgeb/actions/runs/18491802",
      triggeredAt: "2026-06-10T13:55:04Z",
    },
    changedFiles: ["package.json", "pnpm-lock.yaml"],
    failedLogPath: fixturePath("dependency-timeout", "failed.log"),
    greenLogPath: fixturePath("dependency-timeout", "last-green.log"),
  },
  {
    id: "test-assertion",
    failureClass: "test_assertion",
    description:
      "pytest assertion failure in avatar upload validation after tightening MIME checks.",
    failedRun: {
      provider: "github-actions",
      runId: "18492144",
      pipelineId: "ci-pr",
      branch: "fix/avatar-mime-guard",
      commitSha: "f1e2d3c4b5a6",
      prNumber: 418,
      status: "failure",
      url: "https://github.com/al-kutub/a-forgeb/actions/runs/18492144",
      triggeredAt: "2026-06-10T15:01:33Z",
    },
    greenRun: {
      provider: "github-actions",
      runId: "18492088",
      pipelineId: "ci-pr",
      branch: "fix/avatar-mime-guard",
      commitSha: "c0ffee00dead",
      prNumber: 418,
      status: "success",
      url: "https://github.com/al-kutub/a-forgeb/actions/runs/18492088",
      triggeredAt: "2026-06-10T14:48:19Z",
    },
    changedFiles: ["app/avatars.py", "tests/test_avatars.py"],
    failedLogPath: fixturePath("test-assertion", "failed.log"),
    greenLogPath: fixturePath("test-assertion", "last-green.log"),
  },
  {
    id: "infra-flake",
    failureClass: "infra_flake",
    description:
      "Transient runner registry outage causes docker pull ECONNRESET during integration stage.",
    failedRun: {
      provider: "github-actions",
      runId: "18492201",
      pipelineId: "ci-pr",
      branch: "chore/bump-postgres-image",
      commitSha: "beefcafe1234",
      prNumber: 421,
      status: "failure",
      url: "https://github.com/al-kutub/a-forgeb/actions/runs/18492201",
      triggeredAt: "2026-06-10T15:18:47Z",
    },
    greenRun: {
      provider: "github-actions",
      runId: "18492190",
      pipelineId: "ci-pr",
      branch: "chore/bump-postgres-image",
      commitSha: "beefcafe1234",
      prNumber: 421,
      status: "success",
      url: "https://github.com/al-kutub/a-forgeb/actions/runs/18492190",
      triggeredAt: "2026-06-10T15:12:02Z",
    },
    changedFiles: ["docker-compose.ci.yml"],
    failedLogPath: fixturePath("infra-flake", "failed.log"),
    greenLogPath: fixturePath("infra-flake", "last-green.log"),
  },
] as const;

export function getFixtureById(id: string): CITriageFixture | undefined {
  return CI_TRIAGE_FIXTURES.find((fixture) => fixture.id === id);
}
