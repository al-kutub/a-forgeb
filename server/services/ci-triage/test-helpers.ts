import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CITriageFixture } from "flake-radar/types/ci-triage";
import { CI_TRIAGE_FIXTURES } from "flake-radar/fixtures/ci-triage";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const FIXTURE_ROOT = join(REPO_ROOT, "packages/shared/fixtures/ci-triage");

/** Read a fixture log relative to packages/shared/fixtures/ci-triage/. */
export function readFixtureLog(relativePath: string): string {
  return readFileSync(join(FIXTURE_ROOT, relativePath), "utf8");
}

/** Pad a log with deterministic CI noise to simulate realistic volume. */
export function padWithCiNoise(logText: string, noiseLines = 400): string {
  const noise = Array.from({ length: noiseLines }, (_, index) => {
    const n = index + 1;
    return `2026-06-10T12:00:${String(n % 60).padStart(2, "0")}Z Progress: resolved ${n}, reused ${n}, downloaded 0, added 0`;
  });
  return `${noise.join("\n")}\n${logText}`;
}

export function loadFixtureLogs(fixture: CITriageFixture): {
  failedLog: string;
  greenLog: string;
} {
  return {
    failedLog: readFixtureLog(fixture.failedLogPath),
    greenLog: readFixtureLog(fixture.greenLogPath),
  };
}

export { CI_TRIAGE_FIXTURES };
