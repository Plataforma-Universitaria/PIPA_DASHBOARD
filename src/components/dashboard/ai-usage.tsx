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
  persona?: string;
  institution?: string;
  toolName?: string;
  refreshVersion: number;
}

export function AiUsage({ fromDate, toDate, provider, persona = "", institution = "", toolName = "", refreshVersion }: AiUsageProps) {
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
      for (const [key, value] of Object.entries({ persona, institution, toolName })) {
        if (value.trim()) params.set(key, value.trim());
      }
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
  }, [fromDate, toDate, provider, persona, institution, toolName, refreshVersion, retryVersion]);

  const metrics = [
    { label: "Tokens de entrada", value: data?.inputTokens, coverage: data?.inferencesWithInputTokens },
    { label: "Tokens de saída", value: data?.outputTokens, coverage: data?.inferencesWithOutputTokens },
    { label: "Tokens totais", value: data?.totalTokens, coverage: data?.inferencesWithTokenUsage },
  ];

  return (
    <section className={styles.aiUsage} aria-label="Consumo de IA" aria-busy={loading}>
      <h2>Tokens consumidos</h2>
      <div className={styles.aiUsageMetrics}>
        {metrics.map(({ label, value, coverage }) => (
          <div key={label} role="group" aria-label={label}>
            <h3>{label}</h3>
            <strong>{loading ? "Carregando…" : formatNumber(value ?? null)}</strong>
            {!loading && !error && data && <p>{data.totalInferences === 0
              ? "Nenhuma inferência no período selecionado."
              : !coverage
                ? "Consumo não informado pelos modelos neste período."
                : `Consumo informado em ${formatNumber(coverage)} de ${formatNumber(data.totalInferences)} inferências${coverage < data.totalInferences ? " (total parcial)" : ""}.`}</p>}
          </div>
        ))}
      </div>
      <p>Todos os filtros se aplicam ao consumo de IA. Persona, instituição e ferramenta consideram o turno inteiro com execução de ferramenta registrada, incluindo seleção, normalização e resposta. Registros antigos sem essa associação ficam fora desses recortes. Registros sem origem são considerados externos.</p>
      {error && <div className={styles.errorBanner} role="alert"><span>{error}</span><button type="button" onClick={() => setRetryVersion((version) => version + 1)}>Recarregar consumo</button></div>}
    </section>
  );
}
