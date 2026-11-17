import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("ai-usage route", () => {
  it("encaminha todos os filtros do dashboard sem identificadores de sessão", async () => {
    const usage = { totalInferences: 3, inferencesWithTokenUsage: 2, totalTokens: 1500, inputTokens: 1200, outputTokens: 300, inferencesWithInputTokens: 2, inferencesWithOutputTokens: 1 };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(usage));
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(new NextRequest("http://dashboard.local/api/observability/ai-usage?from=2026-10-01T00:00:00&aiProvider=external&persona=Aluno&institution=UEG&toolName=notas&provider=ueg&sessionId=privado"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(usage);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe("/api/observability/ai-usage");
    expect(Object.fromEntries(url.searchParams)).toEqual({ from: "2026-10-01T00:00:00", aiProvider: "external", persona: "Aluno", institution: "UEG", toolName: "notas" });
  });

  it("rejeita origem inválida sem chamar o Core", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(new NextRequest("http://dashboard.local/api/observability/ai-usage?aiProvider=ueg"));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
