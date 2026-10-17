import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AiUsage } from "./ai-usage";

const props = { fromDate: "2026-10-01", toDate: "2026-10-14", provider: "" as const, refreshVersion: 0 };

describe("consumo de IA", () => {
  it("exibe total parcial, filtra por origem e atualiza o consumo", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ totalTokens: 12345, totalInferences: 3, inferencesWithTokenUsage: 2 })));
    vi.stubGlobal("fetch", fetchMock);
    const { rerender } = render(<AiUsage {...props} />);
    expect(await screen.findByText("12.345")).toBeInTheDocument();
    expect(screen.getByText(/2 de 3 inferências \(total parcial\)/)).toBeInTheDocument();
    fetchMock.mockImplementation(() => Promise.resolve(Response.json({ totalTokens: 600, totalInferences: 1, inferencesWithTokenUsage: 1 })));
    rerender(<AiUsage {...props} provider="local" />);
    expect(await screen.findByText("600")).toBeInTheDocument();
    const url = new URL(String(fetchMock.mock.calls.at(-1)?.[0]), "http://dashboard.local");
    expect(Object.fromEntries(url.searchParams)).toEqual({ from: "2026-10-01T00:00:00", to: "2026-10-14T23:59:59.999", aiProvider: "local" });
    rerender(<AiUsage {...props} provider="local" refreshVersion={1} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });

  it.each([
    [0, null, "Nenhuma inferência no período selecionado."],
    [2, null, "Consumo não informado pelos modelos neste período."],
  ])("preserva consumo desconhecido com %s inferências", async (totalInferences, totalTokens, message) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ totalTokens, totalInferences, inferencesWithTokenUsage: 0 })));
    render(<AiUsage {...props} />);
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("permite recuperar falha sem apresentar consumo antigo como atual", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValue(Response.json({ totalTokens: 0, totalInferences: 1, inferencesWithTokenUsage: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AiUsage {...props} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar o consumo de IA.");
    fireEvent.click(screen.getByRole("button", { name: "Recarregar consumo" }));
    expect(await screen.findByText("0")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
