"use client";

import {
  Activity,
  Bot,
  ChevronDown,
  Gauge,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/page.module.css";
import { AiUsage } from "./ai-usage";
import { ChannelChart, DailyTrendChart, StatusChart, ToolUsageChart } from "./charts";
import {
  datesForPreset,
  dateRangeError,
  type DashboardFilterState,
  type PeriodPreset,
  toApiFilters,
  toBrowserSearchParams,
} from "@/lib/observability/date-range";
import { formatDuration, formatNumber, formatPercent, formatVariation } from "@/lib/observability/format";
import { toObservabilitySearchParams } from "@/lib/observability/query";
import { formatToolLabel } from "@/lib/observability/tool-labels";
import type { ObservabilityDashboard, ObservabilityFilterOptions } from "@/lib/observability/types";

interface DashboardProps { initialFilters: DashboardFilterState; }

const EMPTY_OPTIONS: ObservabilityFilterOptions = {
  personas: [], tools: [], institutions: [], providers: [], channels: [], results: [],
};

export function Dashboard({ initialFilters }: DashboardProps) {
  const [filters, setFilters] = useState(initialFilters);
  const [dateDraft, setDateDraft] = useState({ fromDate: initialFilters.fromDate, toDate: initialFilters.toDate });
  const [options, setOptions] = useState(EMPTY_OPTIONS);
  const [data, setData] = useState<ObservabilityDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const filterDateError = dateRangeError(filters.fromDate, filters.toDate);
  const draftDateError = dateRangeError(dateDraft.fromDate, dateDraft.toDate);
  const datesPending = dateDraft.fromDate !== filters.fromDate || dateDraft.toDate !== filters.toDate;

  const apiQuery = useMemo(
    () => filterDateError ? "" : toObservabilitySearchParams(toApiFilters(filters)).toString(),
    [filters, filterDateError],
  );

  useEffect(() => {
    if (!apiQuery) return;
    const controller = new AbortController();
    const delay = window.setTimeout(() => {
      setLoading(true);
      setError("");
      const requestOptions = { cache: "no-store" as const, signal: controller.signal };
      Promise.all([
        fetch("/api/observability/filters", requestOptions),
        fetch(`/api/observability/dashboard?${apiQuery}`, requestOptions),
      ])
        .then(async ([optionsResponse, dashboardResponse]) => {
          if (!optionsResponse.ok) throw new Error("Não foi possível carregar os rótulos e filtros das ferramentas.");
          if (!dashboardResponse.ok) {
            const body = await dashboardResponse.json().catch(() => ({})) as { message?: string };
            throw new Error(body.message ?? "Não foi possível carregar o dashboard.");
          }
          const [nextOptions, nextData] = await Promise.all([
            optionsResponse.json() as Promise<ObservabilityFilterOptions>,
            dashboardResponse.json() as Promise<ObservabilityDashboard>,
          ]);
          if (!controller.signal.aborted) {
            setOptions(nextOptions);
            setData(nextData);
          }
        })
        .catch((cause: unknown) => {
          if (!controller.signal.aborted) {
            setError(cause instanceof Error ? cause.message : "Não foi possível carregar o dashboard.");
          }
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 180);
    return () => { window.clearTimeout(delay); controller.abort(); };
  }, [apiQuery, refreshVersion]);

  useEffect(() => {
    const query = toBrowserSearchParams(filters).toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, [filters]);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!exportRef.current?.contains(event.target as Node)) setExportOpen(false);
    }
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  function updateFilter<K extends keyof DashboardFilterState>(key: K, value: DashboardFilterState[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function changePeriod(value: PeriodPreset) {
    const dates = value === "custom" ? { fromDate: filters.fromDate, toDate: filters.toDate } : datesForPreset(value);
    setDateDraft(dates);
    setFilters((current) => ({ ...current, period: value, ...dates }));
  }

  async function exportDashboard(format: "csv" | "pdf") {
    if (filterDateError || (filters.period === "custom" && (datesPending || draftDateError))) return;
    setExportOpen(false);
    setExporting(format);
    setError("");
    try {
      const response = await fetch(`/api/observability/export?${apiQuery}&format=${format}`, { cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? "Não foi possível exportar os dados.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? `observabilidade.${format}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível exportar os dados.");
    } finally {
      setExporting(null);
    }
  }

  const summary = data?.summary;
  const metricCards = [
    { label: "Total de requisições", value: formatNumber(summary?.totalRequests ?? null), variation: summary?.requestVariationPercent == null ? undefined : formatVariation(summary.requestVariationPercent), icon: <Activity size={19} /> },
    { label: "Tempo médio de resposta", value: formatDuration(summary?.averageDurationMs ?? null), icon: <Gauge size={19} /> },
    { label: "Ferramentas utilizadas", description: "Distintas nos filtros selecionados, incluindo tentativas com sucesso ou falha.", value: formatNumber(summary?.activeTools ?? null), icon: <Bot size={19} /> },
    { label: "Taxa de sucesso", value: formatPercent(summary?.successRatePercent ?? null), icon: <Activity size={19} /> },
  ];

  return (
    <main className={styles.main}>
      <section className={styles.headingRow}>
        <div><h1>Desempenho da plataforma</h1><p>Acompanhe requisições, uso de ferramentas e consumo de IA.</p></div>
        <button aria-label="Atualizar dashboard" aria-disabled={loading || !!filterDateError} aria-busy={loading && !filterDateError} className={styles.refreshButton} type="button" onClick={() => { if (!loading && !filterDateError) setRefreshVersion((version) => version + 1); }}><RefreshCw className={loading && !filterDateError ? styles.spinning : ""} size={17} /> Atualizar</button>
      </section>

      <section className={styles.filters} aria-label="Filtros do dashboard">
        <div><label htmlFor="persona">Persona</label><select id="persona" value={filters.persona} onChange={(event) => updateFilter("persona", event.target.value)}><option value="">Todas</option>{options.personas.map((persona) => <option key={persona}>{persona}</option>)}</select></div>
        <div><label htmlFor="period">Período</label><select id="period" value={filters.period} onChange={(event) => changePeriod(event.target.value as PeriodPreset)}><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="custom">Intervalo personalizado</option></select></div>
        <div><label htmlFor="institution">Instituição</label><select id="institution" value={filters.institution} onChange={(event) => updateFilter("institution", event.target.value)}><option value="">Todas</option>{options.institutions.map((institution) => <option key={institution}>{institution}</option>)}</select></div>
        <div><label htmlFor="ai-provider">Origem do modelo</label><select id="ai-provider" value={filters.aiProvider} onChange={(event) => updateFilter("aiProvider", event.target.value as DashboardFilterState["aiProvider"])}><option value="">Todas</option><option value="external">Externo</option><option value="local">Local</option></select></div>
        <div><label htmlFor="tool">Ferramenta</label><select id="tool" value={filters.toolName} onChange={(event) => updateFilter("toolName", event.target.value)}><option value="">Todas</option>{options.tools.map((tool) => <option key={tool} value={tool}>{formatToolLabel(tool, options.toolLabels)}</option>)}</select></div>
        <div className={styles.exportMenu} ref={exportRef}>
          <button aria-expanded={exportOpen} aria-haspopup="menu" className={styles.exportButton} disabled={exporting !== null || !!filterDateError || (filters.period === "custom" && (datesPending || !!draftDateError))} type="button" onClick={() => setExportOpen((open) => !open)}>{exporting ? `Exportando ${exporting.toUpperCase()}…` : "Exportar"} <ChevronDown size={16} /></button>
          {exportOpen && <div className={styles.exportOptions} role="menu"><button role="menuitem" type="button" onClick={() => exportDashboard("csv")}>Exportar CSV</button><button role="menuitem" type="button" onClick={() => exportDashboard("pdf")}>Exportar PDF</button></div>}
        </div>
        {filters.period === "custom" && <form className={styles.customDates} aria-label="Intervalo personalizado" onSubmit={(event) => { event.preventDefault(); if (!draftDateError) setFilters((current) => ({ ...current, ...dateDraft })); }}>
          <div><label htmlFor="from-date">Data inicial</label><input id="from-date" type="date" required max={dateDraft.toDate || undefined} value={dateDraft.fromDate} aria-invalid={!!draftDateError} aria-describedby="date-range-feedback" onChange={(event) => setDateDraft((current) => ({ ...current, fromDate: event.target.value }))} /></div>
          <div><label htmlFor="to-date">Data final</label><input id="to-date" type="date" required min={dateDraft.fromDate || undefined} value={dateDraft.toDate} aria-invalid={!!draftDateError} aria-describedby="date-range-feedback" onChange={(event) => setDateDraft((current) => ({ ...current, toDate: event.target.value }))} /></div>
          <button className={styles.refreshButton} disabled={!!draftDateError} type="submit">Aplicar intervalo</button>
          <p className={styles.dateFeedback} id="date-range-feedback" role={draftDateError ? "alert" : "status"}>{draftDateError || (datesPending ? "Intervalo em edição. Aplique as datas para atualizar os indicadores." : "Intervalo aplicado aos indicadores e ao consumo de IA.")}</p>
        </form>}
      </section>

      {!filterDateError && <p className={styles.appliedPeriod}>Período aplicado: {filters.fromDate.split("-").reverse().join("/")} a {filters.toDate.split("-").reverse().join("/")} (dias completos, incluindo as duas datas).</p>}
      {filterDateError && filters.period !== "custom" && <p className={styles.errorBanner} role="alert">{filterDateError} Selecione um intervalo válido para consultar os dados.</p>}
      {error && <div className={styles.errorBanner} role="alert"><span>{error}</span><button type="button" onClick={() => setRefreshVersion((version) => version + 1)}>Tentar novamente</button></div>}

      {!filterDateError && <>
      <section className={styles.cardGrid} aria-label="Resumo operacional">
        {metricCards.map((card) => <article aria-busy={loading} className={`${styles.metricCard} ${loading ? styles.loading : ""}`} key={card.label}><div className={styles.metricIcon}>{card.icon}</div><p>{card.label}</p>{card.description && <small className={styles.metricDescription}>{card.description}</small>}<div><strong>{loading ? "" : card.value}</strong>{card.variation && !loading && <span title="Variação do número de requisições comparada ao período imediatamente anterior, de mesma duração e com os mesmos filtros.">{card.variation} vs. período anterior</span>}</div></article>)}
      </section>

      <AiUsage fromDate={filters.fromDate} toDate={filters.toDate} provider={filters.aiProvider} persona={filters.persona} institution={filters.institution} toolName={filters.toolName} refreshVersion={refreshVersion} />

      <section className={styles.chartGrid} aria-label="Indicadores gráficos">
        <article className={`${styles.chartCard} ${styles.fullWidthChart}`}><div className={styles.chartTitle}><div><p>Uso de ferramentas</p><span>Top 10 por requisições</span></div></div>{loading ? <div className={styles.chartSkeleton} /> : <ToolUsageChart data={data?.topTools ?? []} toolLabels={options.toolLabels} />}</article>
        <article className={styles.chartCard}><div className={styles.chartTitle}><div><p>Tendência de requisições</p><span>Volume diário</span></div></div>{loading ? <div className={styles.chartSkeleton} /> : <DailyTrendChart data={data?.dailyTrend ?? []} />}</article>
        <article className={styles.chartCard}><div className={styles.chartTitle}><div><p>Status das requisições</p><span>Sucessos e falhas</span></div></div>{loading ? <div className={styles.chartSkeleton} /> : <StatusChart data={data?.statusDistribution ?? []} successRate={summary?.successRatePercent ?? null} />}</article>
        <article className={styles.chartCard}><div className={styles.chartTitle}><div><p>Requisições por canal</p><span>Origem das execuções</span></div></div>{loading ? <div className={styles.chartSkeleton} /> : <ChannelChart data={data?.requestsByChannel ?? []} />}</article>
      </section>
      </>}
    </main>
  );
}
