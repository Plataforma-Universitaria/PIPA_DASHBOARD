import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "./dashboard";
import type { ObservabilityDashboard } from "@/lib/observability/types";

vi.mock("./charts", () => ({
  ToolUsageChart: ({ data, toolLabels }: { data: { toolName: string }[]; toolLabels?: Record<string, string> }) => <div>ferramentas:{data.length}{data.map((tool) => <span key={tool.toolName}>{toolLabels?.[tool.toolName] ?? tool.toolName}</span>)}</div>,
  DailyTrendChart: ({ data }: { data: unknown[] }) => <div>tendência:{data.length}</div>,
  StatusChart: ({ data }: { data: unknown[] }) => <div>status:{data.length}</div>,
  ChannelChart: ({ data }: { data: unknown[] }) => <div>canais:{data.length}</div>,
}));

const initialFilters = {
  period: "30" as const,
  fromDate: "2026-08-01",
  toDate: "2026-08-30",
  persona: "",
  toolName: "",
  institution: "",
  aiProvider: "" as const,
};

const dashboard: ObservabilityDashboard = {
  summary: { totalRequests: 1234, requestVariationPercent: null, averageDurationMs: 250, activeTools: 4, successRatePercent: 97.5 },
  topTools: [{ toolName: "Notas", requests: 500 }],
  dailyTrend: [{ date: "2026-08-30", requests: 10 }],
  statusDistribution: [{ label: "Sucesso", requests: 9, percentage: 90 }],
  requestsByChannel: [{ label: "Telegram", requests: 10, percentage: 100 }],
};

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
}

describe("Dashboard", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("carrega opções, cards e mantém filtros na URL", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => String(input).includes("/ai-usage")
      ? jsonResponse({ totalTokens: 1500, totalInferences: 2, inferencesWithTokenUsage: 2 })
      : String(input).includes("/filters")
      ? jsonResponse({ personas: ["ALUNO"], tools: ["Notas", "obter_as_notas_de_uma_disciplina"], toolLabels: { obter_as_notas_de_uma_disciplina: "Obter as notas de uma disciplina" }, institutions: ["UEG"], providers: [], channels: [], results: [] })
      : jsonResponse(dashboard));
    vi.stubGlobal("fetch", fetchMock);
    render(<Dashboard initialFilters={initialFilters} />);

    expect(screen.getByLabelText("Resumo operacional").querySelector("[aria-busy='true']")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Desempenho da plataforma");
    expect(screen.queryByText("OBSERVABILIDADE")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Atualizar dashboard" })).toHaveAttribute("aria-disabled", "true");
    expect(await screen.findByText("1.234")).toBeInTheDocument();
    expect(screen.getByText("250 ms")).toBeInTheDocument();
    expect(screen.getByText("Ferramentas utilizadas").closest("article")).toHaveTextContent("4");
    expect(screen.getByText("Distintas nos filtros selecionados, incluindo tentativas com sucesso ou falha.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Atualizar dashboard" })).toHaveAttribute("aria-disabled", "false");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Ferramenta")).toBeInTheDocument();
    expect(screen.getByText("ferramentas:1")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Persona"), { target: { value: "ALUNO" } });
    await waitFor(() => expect(window.location.search).toContain("persona=ALUNO"));
    expect(screen.getByRole("option", { name: "Obter as notas de uma disciplina" })).toHaveValue("obter_as_notas_de_uma_disciplina");
    fireEvent.change(screen.getByLabelText("Ferramenta"), { target: { value: "obter_as_notas_de_uma_disciplina" } });
    await waitFor(() => expect(window.location.search).toContain("toolName=obter_as_notas_de_uma_disciplina"));
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/dashboard?") && String(input).includes("toolName=obter_as_notas_de_uma_disciplina"))).toBe(true));
    fireEvent.change(screen.getByLabelText("Origem do modelo"), { target: { value: "local" } });
    await waitFor(() => expect(window.location.search).toContain("aiProvider=local"));
    for (const endpoint of ["/dashboard", "/ai-usage"]) {
      await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => {
        const url = new URL(String(input), "http://dashboard.local");
        return url.pathname.endsWith(endpoint) && url.searchParams.get("aiProvider") === "local";
      })).toBe(true));
    }
    fireEvent.click(screen.getByRole("button", { name: /^Exportar/ }));
    expect(screen.getByRole("menuitem", { name: "Exportar CSV" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Exportar PDF" })).toBeInTheDocument();
  });

  it("hidrata sem divergência quando o botão não tem disabled nativo", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    const container = document.createElement("div");
    container.innerHTML = renderToString(<Dashboard initialFilters={initialFilters} />);
    // Reproduz o DOM do erro reportado: disabled ausente antes da hidratação.
    container.querySelector('[aria-label="Atualizar dashboard"]')?.removeAttribute("disabled");
    document.body.appendChild(container);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const recoverableErrors: unknown[] = [];
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, <Dashboard initialFilters={initialFilters} />, {
          onRecoverableError: (error) => recoverableErrors.push(error),
        });
      });
      expect(consoleError).not.toHaveBeenCalled();
      expect(recoverableErrors).toEqual([]);
      const button = screen.getByRole("button", { name: "Atualizar dashboard" });
      expect(button).toHaveAttribute("aria-disabled", "true");
      expect(button).not.toHaveAttribute("disabled");
    } finally {
      await act(async () => root?.unmount());
      container.remove();
      consoleError.mockRestore();
    }
  });

  it("ignora atualização durante a consulta e permite atualizar depois", async () => {
    let resolveDashboard: (response: Response) => void = () => {};
    let dashboardCalls = 0;
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      if (String(input).includes("/filters")) return jsonResponse({ personas: [], tools: [], institutions: [], providers: [], channels: [], results: [] });
      if (String(input).includes("/ai-usage")) return jsonResponse({ totalTokens: null, totalInferences: 0, inferencesWithTokenUsage: 0 });
      dashboardCalls += 1;
      return new Promise<Response>((resolve) => { resolveDashboard = resolve; });
    }));
    render(<Dashboard initialFilters={initialFilters} />);
    await waitFor(() => expect(dashboardCalls).toBe(1));
    const button = screen.getByRole("button", { name: "Atualizar dashboard" });
    fireEvent.click(button);
    await act(async () => resolveDashboard(Response.json(dashboard)));
    expect(await screen.findByText("1.234")).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-disabled", "false");
    expect(dashboardCalls).toBe(1);
    fireEvent.click(button);
    await waitFor(() => expect(dashboardCalls).toBe(2));
    expect(button).toHaveAttribute("aria-disabled", "true");
    await act(async () => resolveDashboard(Response.json(dashboard)));
  });

  it("exibe falha recuperável e tenta novamente", async () => {
    let dashboardCalls = 0;
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      if (String(input).includes("/filters")) return jsonResponse({ personas: [], tools: [], institutions: [], providers: [], channels: [], results: [] });
      if (String(input).includes("/ai-usage")) return jsonResponse({ totalTokens: null, totalInferences: 0, inferencesWithTokenUsage: 0 });
      dashboardCalls += 1;
      return dashboardCalls === 1 ? jsonResponse({ message: "Core indisponível." }, 503) : jsonResponse(dashboard);
    }));
    render(<Dashboard initialFilters={initialFilters} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Core indisponível.");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("1.234")).toBeInTheDocument();
  });

  it("aplica datas personalizadas juntas e atualiza métricas e tokens com os mesmos limites", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://dashboard.local");
      if (url.pathname.endsWith("/filters")) return jsonResponse({ personas: [], tools: [], institutions: [], providers: [], channels: [], results: [] });
      if (url.pathname.endsWith("/ai-usage")) return jsonResponse({ totalTokens: 1500, totalInferences: 2, inferencesWithTokenUsage: 2 });
      return jsonResponse({ ...dashboard, summary: { ...dashboard.summary, totalRequests: url.searchParams.get("from") === "2026-08-12T00:00:00" ? 17 : 1234 } });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<Dashboard initialFilters={initialFilters} />);
    expect(await screen.findByText("1.234")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Período"), { target: { value: "custom" } });
    fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-08-12" } });
    fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-08-12" } });
    expect(screen.getByRole("status")).toHaveTextContent("Intervalo em edição");
    expect(window.location.search).toContain("from=2026-08-01");
    expect(screen.getByRole("button", { name: /^Exportar/ })).toBeDisabled();
    fireEvent.submit(screen.getByRole("form", { name: "Intervalo personalizado" }));
    expect(await screen.findByText("17")).toBeInTheDocument();
    for (const endpoint of ["/dashboard", "/ai-usage"]) {
      await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => {
        const url = new URL(String(input), "http://dashboard.local");
        return url.pathname.endsWith(endpoint) && url.searchParams.get("from") === "2026-08-12T00:00:00" && url.searchParams.get("to") === "2026-08-12T23:59:59.999";
      })).toBe(true));
    }
    expect(window.location.search).toContain("to=2026-08-12");
    expect(screen.getByRole("button", { name: /^Exportar/ })).toBeEnabled();
  });

  it("bloqueia intervalo invertido ou incompleto, mantendo as datas aplicadas", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => String(input).includes("/filters")
      ? jsonResponse({ personas: [], tools: [], institutions: [], providers: [], channels: [], results: [] })
      : String(input).includes("/ai-usage") ? jsonResponse({ totalTokens: null, totalInferences: 0, inferencesWithTokenUsage: 0 }) : jsonResponse(dashboard)));
    render(<Dashboard initialFilters={initialFilters} />);
    expect(await screen.findByText("1.234")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Período"), { target: { value: "custom" } });
    fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-07-31" } });
    expect(screen.getByRole("alert")).toHaveTextContent("A data final deve ser igual ou posterior");
    expect(screen.getByRole("button", { name: "Aplicar intervalo" })).toBeDisabled();
    fireEvent.submit(screen.getByRole("form", { name: "Intervalo personalizado" }));
    expect(window.location.search).toContain("to=2026-08-30");
    fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "" } });
    expect(screen.getByRole("alert")).toHaveTextContent("válidas");
    expect(screen.getByRole("button", { name: "Aplicar intervalo" })).toBeDisabled();
  });

  it("não consulta dados com intervalo invertido recebido pela URL", async () => {
    const fetchMock = vi.fn(() => jsonResponse({ personas: [], tools: [], institutions: [], providers: [], channels: [], results: [] }));
    vi.stubGlobal("fetch", fetchMock);
    render(<Dashboard initialFilters={{ ...initialFilters, period: "custom", fromDate: "2026-08-20", toDate: "2026-08-12" }} />);
    expect(screen.queryByLabelText("Resumo operacional")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Atualizar dashboard" })).toHaveAttribute("aria-disabled", "true");
    expect(fetchMock.mock.calls.every(([input]) => String(input).endsWith("/filters"))).toBe(true);
  });

  it("explica a variação e exibe o período efetivamente aplicado", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => String(input).includes("/filters")
      ? jsonResponse({ personas: [], tools: [], institutions: [], providers: [], channels: [], results: [] })
      : String(input).includes("/ai-usage") ? jsonResponse({ totalTokens: null, totalInferences: 0, inferencesWithTokenUsage: 0 })
      : jsonResponse({ ...dashboard, summary: { ...dashboard.summary, requestVariationPercent: 172 } })));
    render(<Dashboard initialFilters={initialFilters} />);
    expect(await screen.findByText("+172% vs. período anterior")).toHaveAttribute("title", expect.stringContaining("mesma duração"));
    expect(screen.getByText(/Período aplicado: 01\/08\/2026 a 30\/08\/2026/)).toBeInTheDocument();
  });

  it("recarrega rótulos ao atualizar e aguarda os metadados antes de mostrar uma ferramenta nova", async () => {
    const name = "receber_a_declaracao_de_frequencia_por_email";
    const label = "Receber a declaração de frequência por email";
    let optionCalls = 0;
    let dashboardCalls = 0;
    let releaseOptions: (response: Response) => void = () => {};
    const initialOptions = { personas: [], tools: ["Notas"], institutions: [], providers: [], channels: [], results: [], toolLabels: {} };
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      if (String(input).includes("/filters")) {
        optionCalls += 1;
        return optionCalls === 1 ? jsonResponse(initialOptions) : new Promise<Response>((resolve) => { releaseOptions = resolve; });
      }
      if (String(input).includes("/ai-usage")) return jsonResponse({ totalTokens: null, totalInferences: 0, inferencesWithTokenUsage: 0 });
      dashboardCalls += 1;
      return jsonResponse(dashboardCalls === 1 ? dashboard : { ...dashboard, topTools: [{ toolName: name, requests: 1 }] });
    }));
    render(<Dashboard initialFilters={initialFilters} />);
    expect(await screen.findByText("1.234")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Atualizar dashboard" }));
    await waitFor(() => expect(optionCalls).toBe(2));
    expect(dashboardCalls).toBe(2);
    expect(screen.queryByText(name)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Resumo operacional").querySelector("[aria-busy='true']")).toBeInTheDocument();
    await act(async () => releaseOptions(Response.json({ ...initialOptions, tools: ["Notas", name], toolLabels: { [name]: label } })));
    expect(await screen.findByRole("option", { name: label })).toHaveValue(name);
    expect(screen.getByText(label, { selector: "span" })).toBeInTheDocument();
    expect(screen.queryByText(name)).not.toBeInTheDocument();
  });

  it("permite tentar novamente quando o carregamento dos rótulos falha", async () => {
    let optionCalls = 0;
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      if (String(input).includes("/filters")) {
        optionCalls += 1;
        return optionCalls === 1 ? jsonResponse({}, 503) : jsonResponse({ personas: [], tools: [], institutions: [], providers: [], channels: [], results: [] });
      }
      if (String(input).includes("/ai-usage")) return jsonResponse({ totalTokens: null, totalInferences: 0, inferencesWithTokenUsage: 0 });
      return jsonResponse(dashboard);
    }));
    render(<Dashboard initialFilters={initialFilters} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("rótulos e filtros");
    expect(screen.queryByText("1.234")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("1.234")).toBeInTheDocument();
    expect(optionCalls).toBe(2);
  });
});
