import type { DashboardFilters } from "./types";

export const OBSERVABILITY_FILTER_KEYS = [
  "from",
  "to",
  "persona",
  "toolName",
  "institution",
] as const;

export type ObservabilityFilterKey = (typeof OBSERVABILITY_FILTER_KEYS)[number];

export function pickObservabilityFilters(source: URLSearchParams): URLSearchParams {
  const result = new URLSearchParams();
  for (const key of OBSERVABILITY_FILTER_KEYS) {
    const value = source.get(key)?.trim();
    if (value) result.set(key, value);
  }
  return result;
}

export function toObservabilitySearchParams(filters: DashboardFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of OBSERVABILITY_FILTER_KEYS) {
    const value = filters[key].trim();
    if (value) params.set(key, value);
  }
  return params;
}
