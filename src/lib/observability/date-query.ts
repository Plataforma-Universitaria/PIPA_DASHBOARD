import { validDate } from "./date-range";

// Datas locais ISO, no mesmo contrato de LocalDateTime dos endpoints do Core.
function comparableTimestamp(value: string): string | null {
  const parts = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?$/);
  if (!parts || !validDate(parts[1]) || Number(parts[2]) > 23 || Number(parts[3]) > 59 || Number(parts[4] ?? 0) > 59) return null;
  return `${parts[1]}T${parts[2]}:${parts[3]}:${parts[4] ?? "00"}.${(parts[5] ?? "").padEnd(9, "0")}`;
}

export function queryDateRangeError(params: URLSearchParams): string {
  const from = params.has("from") ? comparableTimestamp(params.get("from")!.trim()) : null;
  const to = params.has("to") ? comparableTimestamp(params.get("to")!.trim()) : null;
  if ((params.has("from") && !from) || (params.has("to") && !to)) return "Informe datas e horários válidos para o período.";
  return from && to && from > to ? "A data final deve ser igual ou posterior à data inicial." : "";
}
