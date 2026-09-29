const numberFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function formatNumber(value: number | null): string {
  return value == null ? "—" : numberFormatter.format(value);
}

export function formatDuration(value: number | null): string {
  return value == null ? "—" : `${numberFormatter.format(value)} ms`;
}

export function formatPercent(value: number | null): string {
  return value == null ? "—" : `${numberFormatter.format(value)}%`;
}

export function formatVariation(value: number | null): string {
  if (value == null) return "—";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${numberFormatter.format(value)}%`;
}
