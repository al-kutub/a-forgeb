/**
 * HTTP client for Flake Radar REST routes (server/routes/flake-radar).
 */
import type {
  FlakeRadarSnapshot,
  FlakeScoreRanking,
  PipelineHealthMetrics,
  QuarantineRecord,
  SelectionRecommendation,
} from "flake-radar/types/flake-radar";

export interface FlakeRadarApiConfig {
  /** Base URL for the API, e.g. "" for same-origin or "http://127.0.0.1:8000". */
  baseUrl?: string;
  /** Optional bearer token for authenticated deployments. */
  token?: string;
}

const DEFAULT_BASE = "";

function buildUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}${path}`;
}

async function fetchJson<T>(
  url: string,
  config: FlakeRadarApiConfig,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(
      `Flake Radar API ${response.status}: ${response.statusText}`,
    );
  }
  return (await response.json()) as T;
}

/** GET /flake-radar/repos/:repoId/snapshot — aggregate dashboard payload. */
export async function fetchSnapshot(
  repoId: string,
  config: FlakeRadarApiConfig = {},
): Promise<FlakeRadarSnapshot> {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE;
  return fetchJson<FlakeRadarSnapshot>(
    buildUrl(baseUrl, `/flake-radar/repos/${encodeURIComponent(repoId)}/snapshot`),
    config,
  );
}

/** GET /flake-radar/repos/:repoId/scores — ranked instability scores. */
export async function fetchScores(
  repoId: string,
  config: FlakeRadarApiConfig = {},
): Promise<FlakeScoreRanking> {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE;
  return fetchJson<FlakeScoreRanking>(
    buildUrl(baseUrl, `/flake-radar/repos/${encodeURIComponent(repoId)}/scores`),
    config,
  );
}

/** GET /flake-radar/repos/:repoId/quarantine — active quarantine records. */
export async function fetchQuarantine(
  repoId: string,
  config: FlakeRadarApiConfig = {},
): Promise<QuarantineRecord[]> {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE;
  const body = await fetchJson<{ records: QuarantineRecord[] }>(
    buildUrl(
      baseUrl,
      `/flake-radar/repos/${encodeURIComponent(repoId)}/quarantine`,
    ),
    config,
  );
  return body.records;
}

/** GET /flake-radar/repos/:repoId/metrics — pipeline health metrics. */
export async function fetchMetrics(
  repoId: string,
  config: FlakeRadarApiConfig = {},
): Promise<PipelineHealthMetrics> {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE;
  return fetchJson<PipelineHealthMetrics>(
    buildUrl(
      baseUrl,
      `/flake-radar/repos/${encodeURIComponent(repoId)}/metrics`,
    ),
    config,
  );
}

/** GET /flake-radar/repos/:repoId/selection — latest predictive subset. */
export async function fetchSelection(
  repoId: string,
  config: FlakeRadarApiConfig = {},
): Promise<SelectionRecommendation | null> {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE;
  const body = await fetchJson<{ selection: SelectionRecommendation | null }>(
    buildUrl(
      baseUrl,
      `/flake-radar/repos/${encodeURIComponent(repoId)}/selection`,
    ),
    config,
  );
  return body.selection;
}
