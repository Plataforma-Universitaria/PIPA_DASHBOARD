export type NullableMetric = number | null;

export interface ObservabilityFilterOptions {
  personas: string[];
  tools: string[];
  institutions: string[];
  providers: string[];
  channels: string[];
  results: string[];
}

export interface DashboardSummary {
  totalRequests: number;
  requestVariationPercent: NullableMetric;
  averageDurationMs: NullableMetric;
  activeTools: number;
  successRatePercent: NullableMetric;
}

export interface ToolUsage {
  toolName: string;
  requests: number;
}

export interface DailyTrend {
  date: string;
  requests: number;
}

export interface Distribution {
  label: string;
  requests: number;
  percentage: NullableMetric;
}

export interface ObservabilityDashboard {
  summary: DashboardSummary;
  topTools: ToolUsage[];
  dailyTrend: DailyTrend[];
  statusDistribution: Distribution[];
  requestsByChannel: Distribution[];
}

export interface ApiError {
  message: string;
}

export interface DashboardFilters {
  from: string;
  to: string;
  persona: string;
  toolName: string;
  institution: string;
}
