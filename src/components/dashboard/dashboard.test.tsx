import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "./dashboard";
import type { ObservabilityDashboard } from "@/lib/observability/types";

vi.mock("./charts", () => ({
  ToolUsageChart: ({ data }: { data: unknown[] }) => <div>ferramentas:{data.length}</div>,
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
    const fetchMock = vi.fn((input: RequestInfo | URL) => String(input).includes("/filters")
      ? jsonResponse({ personas: ["ALUNO"], tools: ["Notas"], institutions: ["UEG"], providers: [], channels: [], results: [] })
      : jsonResponse(dashboard));
    vi.stubGlobal("fetch", fetchMock);
    render(<Dashboard initialFilters={initialFilters} />);

    expect(screen.getByLabelText("Resumo operacional").querySelector("[aria-busy='true']")).toBeInTheDocument();
    expect(await screen.findByText("1.234")).toBeInTheDocument();
    expect(screen.getByText("250 ms")).toBeInTheDocument();
    expect(screen.getByText("ferramentas:1")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Persona"), { target: { value: "ALUNO" } });
    await waitFor(() => expect(window.location.search).toContain("persona=ALUNO"));
    fireEvent.click(screen.getByRole("button", { name: /^Exportar/ }));
    expect(screen.getByRole("menuitem", { name: "Exportar CSV" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Exportar PDF" })).toBeInTheDocument();
  });

  it("exibe falha recuperável e tenta novamente", async () => {
    let dashboardCalls = 0;
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      if (String(input).includes("/filters")) return jsonResponse({ personas: [], tools: [], institutions: [], providers: [], channels: [], results: [] });
      dashboardCalls += 1;
      return dashboardCalls === 1 ? jsonResponse({ message: "Core indisponível." }, 503) : jsonResponse(dashboard);
    }));
    render(<Dashboard initialFilters={initialFilters} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Core indisponível.");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("1.234")).toBeInTheDocument();
  });
});
