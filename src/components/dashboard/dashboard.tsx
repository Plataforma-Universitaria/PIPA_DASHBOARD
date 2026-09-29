"use client";

import {
  Activity,
  Bot,
  ChevronDown,
  Gauge,
  LayoutDashboard,
  Layers3,
  Menu,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/page.module.css";
import { ChannelChart, DailyTrendChart, StatusChart, ToolUsageChart } from "./charts";
import {
  datesForPreset,
  type DashboardFilterState,
  type PeriodPreset,
  toApiFilters,
  toBrowserSearchParams,
} from "@/lib/observability/date-range";
import { formatDuration, formatNumber, formatPercent, formatVariation } from "@/lib/observability/format";
import { toObservabilitySearchParams } from "@/lib/observability/query";
import type { ObservabilityDashboard, ObservabilityFilterOptions } from "@/lib/observability/types";

interface DashboardProps { initialFilters: DashboardFilterState; }

const EMPTY_OPTIONS: ObservabilityFilterOptions = {
  personas: [], tools: [], institutions: [], providers: [], channels: [], results: [],
};

export function Dashboard({ initialFilters }: DashboardProps) {
  const [filters, setFilters] = useState(initialFilters);
  const [toolSearch, setToolSearch] = useState(initialFilters.toolName);
  const [options, setOptions] = useState(EMPTY_OPTIONS);
  const [data, setData] = useState<ObservabilityDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const apiQuery = useMemo(
    () => toObservabilitySearchParams(toApiFilters(filters)).toString(),
    [filters],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/observability/filters", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Não foi possível carregar os filtros.");
        return response.json() as Promise<ObservabilityFilterOptions>;
      })
      .then(setOptions)
      .catch((cause: unknown) => {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) {
          setError(cause instanceof Error ? cause.message : "Não foi possível carregar os filtros.");
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const delay = window.setTimeout(() => {
      setLoading(true);
      setError("");
      fetch(`/api/observability/dashboard?${apiQuery}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            const body = await response.json().catch(() => ({})) as { message?: string };
            throw new Error(body.message ?? "Não foi possível carregar o dashboard.");
          }
          return response.json() as Promise<ObservabilityDashboard>;
        })
        .then(setData)
        .catch((cause: unknown) => {
          if (!(cause instanceof DOMException && cause.name === "AbortError")) {
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
    if (value === "custom") return setFilters((current) => ({ ...current, period: value }));
    setFilters((current) => ({ ...current, period: value, ...datesForPreset(value) }));
  }

  function changeTool(value: string) {
    setToolSearch(value);
    const exact = options.tools.find((tool) => tool.toLocaleLowerCase("pt-BR") === value.trim().toLocaleLowerCase("pt-BR"));
    updateFilter("toolName", exact ?? "");
  }

  async function exportDashboard(format: "csv" | "pdf") {
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
    { label: "Total de requisições", value: formatNumber(summary?.totalRequests ?? null), variation: formatVariation(summary?.requestVariationPercent ?? null), icon: <Activity size={19} /> },
    { label: "Tempo médio de resposta", value: formatDuration(summary?.averageDurationMs ?? null), icon: <Gauge size={19} /> },
    { label: "Ferramentas ativas", value: formatNumber(summary?.activeTools ?? null), icon: <Bot size={19} /> },
    { label: "Taxa de sucesso", value: formatPercent(summary?.successRatePercent ?? null), icon: <Activity size={19} /> },
  ];

  return (
    <div className={styles.appShell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}><span>P</span><strong>Plataforma PIPA</strong></div>
        <button aria-controls="main-navigation" aria-expanded={mobileNavOpen} aria-label={mobileNavOpen ? "Fechar navegação" : "Abrir navegação"} className={styles.mobileMenuButton} type="button" onClick={() => setMobileNavOpen((open) => !open)}><Menu size={20} /></button>
        <nav aria-label="Navegação principal" className={`${styles.nav} ${mobileNavOpen ? styles.navOpen : ""}`} id="main-navigation">
          <a className={styles.navActive} href="#"><LayoutDashboard size={20} /> Dashboard</a>
          <span aria-disabled="true"><Layers3 size={20} /> Services <small>Em breve</small></span>
          <span aria-disabled="true"><Activity size={20} /> Activity <small>Em breve</small></span>
          <span aria-disabled="true"><Users size={20} /> Users <small>Em breve</small></span>
        </nav>
        <div className={styles.sidebarFoot}><Gauge size={18} /><span>Observabilidade</span></div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.toolSearch}>
            <Search size={19} aria-hidden="true" />
            <label className="sr-only" htmlFor="tool-search">Buscar ferramenta</label>
            <input id="tool-search" list="tool-options" placeholder="Buscar ferramenta" value={toolSearch} onChange={(event) => changeTool(event.target.value)} />
            <datalist id="tool-options">{options.tools.map((tool) => <option value={tool} key={tool} />)}</datalist>
            {toolSearch && <button aria-label="Limpar ferramenta" type="button" onClick={() => changeTool("")}><X size={16} /></button>}
          </div>
          <div className={styles.avatar} aria-label="Perfil administrativo">A</div>
        </header>

        <main className={styles.main}>
          <section className={styles.headingRow}>
            <div><p className={styles.eyebrow}>OBSERVABILIDADE</p><h1>Visão Geral dos Serviços</h1><p>Desempenho das ferramentas acadêmicas e integrações da plataforma.</p></div>
            <button aria-label="Atualizar dashboard" className={styles.refreshButton} disabled={loading} type="button" onClick={() => setRefreshVersion((version) => version + 1)}><RefreshCw className={loading ? styles.spinning : ""} size={17} /> Atualizar</button>
          </section>

          <section className={styles.filters} aria-label="Filtros do dashboard">
            <div><label htmlFor="persona">Persona</label><select id="persona" value={filters.persona} onChange={(event) => updateFilter("persona", event.target.value)}><option value="">Todas</option>{options.personas.map((persona) => <option key={persona}>{persona}</option>)}</select></div>
            <div><label htmlFor="period">Período</label><select id="period" value={filters.period} onChange={(event) => changePeriod(event.target.value as PeriodPreset)}><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="custom">Intervalo personalizado</option></select></div>
            <div><label htmlFor="institution">Instituição</label><select id="institution" value={filters.institution} onChange={(event) => updateFilter("institution", event.target.value)}><option value="">Todas</option>{options.institutions.map((institution) => <option key={institution}>{institution}</option>)}</select></div>
            <div className={styles.exportMenu} ref={exportRef}>
              <button aria-expanded={exportOpen} aria-haspopup="menu" className={styles.exportButton} disabled={exporting !== null} type="button" onClick={() => setExportOpen((open) => !open)}>{exporting ? `Exportando ${exporting.toUpperCase()}…` : "Exportar"} <ChevronDown size={16} /></button>
              {exportOpen && <div className={styles.exportOptions} role="menu"><button role="menuitem" type="button" onClick={() => exportDashboard("csv")}>Exportar CSV</button><button role="menuitem" type="button" onClick={() => exportDashboard("pdf")}>Exportar PDF</button></div>}
            </div>
            {filters.period === "custom" && <div className={styles.customDates}><div><label htmlFor="from-date">Data inicial</label><input id="from-date" type="date" max={filters.toDate} value={filters.fromDate} onChange={(event) => updateFilter("fromDate", event.target.value)} /></div><div><label htmlFor="to-date">Data final</label><input id="to-date" type="date" min={filters.fromDate} value={filters.toDate} onChange={(event) => updateFilter("toDate", event.target.value)} /></div></div>}
          </section>

          {error && <div className={styles.errorBanner} role="alert"><span>{error}</span><button type="button" onClick={() => setRefreshVersion((version) => version + 1)}>Tentar novamente</button></div>}

          <section className={styles.cardGrid} aria-label="Resumo operacional">
            {metricCards.map((card) => <article aria-busy={loading} className={`${styles.metricCard} ${loading ? styles.loading : ""}`} key={card.label}><div className={styles.metricIcon}>{card.icon}</div><p>{card.label}</p><div><strong>{loading ? "" : card.value}</strong>{card.variation && !loading && <span>{card.variation}</span>}</div></article>)}
          </section>

          <section className={styles.chartGrid} aria-label="Indicadores gráficos">
            <article className={styles.chartCard}><div className={styles.chartTitle}><div><p>Uso de ferramentas</p><span>Top 10 por requisições</span></div></div>{loading ? <div className={styles.chartSkeleton} /> : <ToolUsageChart data={data?.topTools ?? []} />}</article>
            <article className={styles.chartCard}><div className={styles.chartTitle}><div><p>Tendência de requisições</p><span>Volume diário</span></div></div>{loading ? <div className={styles.chartSkeleton} /> : <DailyTrendChart data={data?.dailyTrend ?? []} />}</article>
            <article className={styles.chartCard}><div className={styles.chartTitle}><div><p>Status das requisições</p><span>Sucessos e falhas</span></div></div>{loading ? <div className={styles.chartSkeleton} /> : <StatusChart data={data?.statusDistribution ?? []} successRate={summary?.successRatePercent ?? null} />}</article>
            <article className={styles.chartCard}><div className={styles.chartTitle}><div><p>Requisições por canal</p><span>Origem das execuções</span></div></div>{loading ? <div className={styles.chartSkeleton} /> : <ChannelChart data={data?.requestsByChannel ?? []} />}</article>
          </section>
        </main>
      </div>
    </div>
  );
}
