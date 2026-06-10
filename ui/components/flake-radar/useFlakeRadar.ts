import { useCallback, useEffect, useState } from "react";
import type { FlakeRadarSnapshot } from "flake-radar/types/flake-radar";
import { fetchSnapshot, type FlakeRadarApiConfig } from "./api.js";

export interface UseFlakeRadarResult {
  snapshot: FlakeRadarSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/** Loads the aggregate Flake Radar snapshot for a repository. */
export function useFlakeRadar(
  repoId: string,
  config: FlakeRadarApiConfig = {},
): UseFlakeRadarResult {
  const [snapshot, setSnapshot] = useState<FlakeRadarSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSnapshot(repoId, config)
      .then((data) => {
        if (!cancelled) {
          setSnapshot(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setSnapshot(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [repoId, config.baseUrl, config.token, tick]);

  return { snapshot, loading, error, refresh };
}
