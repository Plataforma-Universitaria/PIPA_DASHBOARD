import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AiUsage } from "./ai-usage";

const props = { fromDate: "2026-10-01", toDate: "2026-10-14", provider: "" as const, refreshVersion: 0 };

describe("consumo de IA", () => {
  it("exibe total parcial, filtra por origem e atualiza o consumo", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ totalTokens: 12345, inputTokens: 12000, outputTokens: 345, totalInferences: 3, inferencesWithTokenUsage: 2, inferencesWithInputTokens: 2, inferencesWithOutputTokens: 3 })));
    vi.stubGlobal("fetch", fetchMock);
    const { rerender } = render(<AiUsage {...props} />);
    expect(await screen.findByText("12.345")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Tokens de entrada" })).getByText("12.000")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Tokens de saída" })).getByText("345")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Tokens de entrada" })).getByText(/2 de 3 inferências \(total parcial\)/)).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Tokens totais" })).getByText(/2 de 3 inferências \(total parcial\)/)).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Tokens de saída" })).getByText(/3 de 3 inferências\./)).toBeInTheDocument();
    fetchMock.mockImplementation(() => Promise.resolve(Response.json({ totalTokens: 600, inputTokens: 500, outputTokens: 100, totalInferences: 1, inferencesWithTokenUsage: 1, inferencesWithInputTokens: 1, inferencesWithOutputTokens: 1 })));
    rerender(<AiUsage {...props} provider="local" />);
    expect(await screen.findByText("600")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    const url = new URL(String(fetchMock.mock.calls.at(-1)?.[0]), "http://dashboard.local");
    expect(Object.fromEntries(url.searchParams)).toEqual({ from: "2026-10-01T00:00:00", to: "2026-10-14T23:59:59.999", aiProvider: "local" });
    rerender(<AiUsage {...props} provider="local" refreshVersion={1} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });

  it.each([
    [0, null, "Nenhuma inferência no período selecionado."],
    [2, null, "Consumo não informado pelos modelos neste período."],
  ])("preserva consumo desconhecido com %s inferências", async (totalInferences, totalTokens, message) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ totalTokens, inputTokens: null, outputTokens: null, totalInferences, inferencesWithTokenUsage: 0, inferencesWithInputTokens: 0, inferencesWithOutputTokens: 0 })));
    render(<AiUsage {...props} />);
    expect(await screen.findAllByText(message)).toHaveLength(3);
    expect(screen.getAllByText("—")).toHaveLength(3);
  });

  it("mantém entrada e saída independentes quando o total ou uma contagem não foi informado", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ totalTokens: null, inputTokens: 50, outputTokens: null, totalInferences: 2, inferencesWithTokenUsage: 0, inferencesWithInputTokens: 1, inferencesWithOutputTokens: 0 })));
    render(<AiUsage {...props} />);
    expect(await screen.findByText("50")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Tokens de entrada" })).getByText(/1 de 2 inferências \(total parcial\)/)).toBeInTheDocument();
    for (const name of ["Tokens de saída", "Tokens totais"]) {
      const metric = within(screen.getByRole("group", { name }));
      expect(metric.getByText("—")).toBeInTheDocument();
      expect(metric.getByText("Consumo não informado pelos modelos neste período.")).toBeInTheDocument();
    }
  });

  it("reconsulta tokens quando persona, instituição ou ferramenta mudam", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ totalTokens: null, inputTokens: null, outputTokens: null, totalInferences: 0, inferencesWithTokenUsage: 0, inferencesWithInputTokens: 0, inferencesWithOutputTokens: 0 }));
    vi.stubGlobal("fetch", fetchMock);
    const { rerender } = render(<AiUsage {...props} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    rerender(<AiUsage {...props} persona="Aluno" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    rerender(<AiUsage {...props} persona="Aluno" institution="UEG" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    rerender(<AiUsage {...props} persona="Aluno" institution="UEG" toolName="consultar_notas" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    const url = new URL(String(fetchMock.mock.calls.at(-1)?.[0]), "http://dashboard.local");
    expect(Object.fromEntries(url.searchParams)).toEqual({ from: "2026-10-01T00:00:00", to: "2026-10-14T23:59:59.999", persona: "Aluno", institution: "UEG", toolName: "consultar_notas" });
  });

  it("permite recuperar falha sem apresentar consumo antigo como atual", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValue(Response.json({ totalTokens: 0, inputTokens: 0, outputTokens: 0, totalInferences: 1, inferencesWithTokenUsage: 1, inferencesWithInputTokens: 1, inferencesWithOutputTokens: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AiUsage {...props} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar o consumo de IA.");
    fireEvent.click(screen.getByRole("button", { name: "Recarregar consumo" }));
    expect(await screen.findAllByText("0")).toHaveLength(3);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
