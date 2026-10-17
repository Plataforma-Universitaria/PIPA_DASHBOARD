import type { DashboardFilters } from "./types";

export type PeriodPreset = "7" | "30" | "90" | "custom";

export interface DashboardFilterState {
  period: PeriodPreset;
  fromDate: string;
  toDate: string;
  persona: string;
  toolName: string;
  institution: string;
  aiProvider: "" | "local" | "external";
}

function saoPauloDateParts(now: Date): [number, number, number] {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return [value("year"), value("month"), value("day")];
}

export function todayInSaoPaulo(now = new Date()): string {
  const [year, month, day] = saoPauloDateParts(now);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function subtractCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day - days));
  return result.toISOString().slice(0, 10);
}

export function datesForPreset(preset: Exclude<PeriodPreset, "custom">, now = new Date()) {
  const toDate = todayInSaoPaulo(now);
  return { fromDate: subtractCalendarDays(toDate, Number(preset) - 1), toDate };
}

export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function dateRangeError(fromDate: string, toDate: string): string {
  if (!validDate(fromDate) || !validDate(toDate)) return "Informe uma data inicial e uma data final válidas.";
  return fromDate > toDate ? "A data final deve ser igual ou posterior à data inicial." : "";
}

export function createFilterState(
  source = new URLSearchParams(),
  now = new Date(),
): DashboardFilterState {
  const requestedPeriod = source.get("period");
  const period: PeriodPreset = requestedPeriod === "7" || requestedPeriod === "90"
    || requestedPeriod === "custom" ? requestedPeriod : "30";
  const presetDates = datesForPreset(period === "custom" ? "30" : period, now);
  // Presets sempre refletem o calendário atual; datas salvas na URL só definem o modo personalizado.
  const requestedFrom = period === "custom" ? source.get("from")?.slice(0, 10) : undefined;
  const requestedTo = period === "custom" ? source.get("to")?.slice(0, 10) : undefined;
  const fromDate = requestedFrom ?? (requestedTo && validDate(requestedTo) && requestedTo < presetDates.fromDate ? requestedTo : presetDates.fromDate);
  const toDate = requestedTo ?? (validDate(fromDate) && fromDate > presetDates.toDate ? fromDate : presetDates.toDate);

  return {
    period,
    fromDate,
    toDate,
    persona: source.get("persona")?.trim() ?? "",
    toolName: source.get("toolName")?.trim() ?? "",
    institution: source.get("institution")?.trim() ?? "",
    aiProvider: source.get("aiProvider") === "local" ? "local" : source.get("aiProvider") === "external" ? "external" : "",
  };
}

export function toApiFilters(state: DashboardFilterState): DashboardFilters {
  const error = dateRangeError(state.fromDate, state.toDate);
  if (error) throw new RangeError(error);
  return {
    from: `${state.fromDate}T00:00:00`,
    to: `${state.toDate}T23:59:59.999`,
    persona: state.persona,
    toolName: state.toolName,
    institution: state.institution,
    aiProvider: state.aiProvider,
  };
}

export function toBrowserSearchParams(state: DashboardFilterState): URLSearchParams {
  const params = new URLSearchParams({
    period: state.period,
    from: state.fromDate,
    to: state.toDate,
  });
  if (state.persona) params.set("persona", state.persona);
  if (state.toolName) params.set("toolName", state.toolName);
  if (state.institution) params.set("institution", state.institution);
  if (state.aiProvider) params.set("aiProvider", state.aiProvider);
  return params;
}
