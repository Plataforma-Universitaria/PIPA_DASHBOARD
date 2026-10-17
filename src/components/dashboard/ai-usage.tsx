"use client";

import { useEffect, useState } from "react";
import styles from "@/app/page.module.css";
import type { DashboardFilterState } from "@/lib/observability/date-range";
import { formatNumber } from "@/lib/observability/format";
import type { AiUsageSummary } from "@/lib/observability/types";

interface AiUsageProps {
  fromDate: string;
  toDate: string;
  provider: DashboardFilterState["aiProvider"];
  refreshVersion: number;
}

export function AiUsage({ fromDate, toDate, provider, refreshVersion }: AiUsageProps) {
  const [data, setData] = useState<AiUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const delay = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      setData(null);
      const params = new URLSearchParams({ from: `${fromDate}T00:00:00`, to: `${toDate}T23:59:59.999` });
      if (provider) params.set("aiProvider", provider);
      try {
        const response = await fetch(`/api/observability/ai-usage?${params}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Não foi possível carregar o consumo de IA.");
        const body = await response.json() as AiUsageSummary;
        if (!controller.signal.aborted) setData(body);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Não foi possível carregar o consumo de IA.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => { window.clearTimeout(delay); controller.abort(); };
  }, [fromDate, toDate, provider, refreshVersion, retryVersion]);

  return (
    <section className={styles.aiUsage} aria-label="Consumo de IA">
      <div aria-busy={loading}>
        <h2>Tokens consumidos</h2>
        <strong>{loading ? "Carregando…" : formatNumber(data?.totalTokens ?? null)}</strong>
        {!loading && !error && data && <p>{data.totalInferences === 0
          ? "Nenhuma inferência no período selecionado."
          : data.inferencesWithTokenUsage === 0
            ? "Consumo não informado pelos modelos neste período."
            : `Consumo informado em ${formatNumber(data.inferencesWithTokenUsage)} de ${formatNumber(data.totalInferences)} inferências${data.inferencesWithTokenUsage < data.totalInferences ? " (total parcial)" : ""}.`}</p>}
        <p>Período e origem do modelo filtram todos os indicadores. Persona, instituição e ferramenta se aplicam às execuções de ferramentas e à exportação. Registros sem origem são considerados externos.</p>
      </div>
      {error && <div className={styles.errorBanner} role="alert"><span>{error}</span><button type="button" onClick={() => setRetryVersion((version) => version + 1)}>Recarregar consumo</button></div>}
    </section>
  );
}
