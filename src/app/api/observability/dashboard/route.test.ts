import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("dashboard route", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("descarta filtros diagnósticos antes de chamar o Core", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ summary: { totalRequests: 0 } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(new NextRequest(
      "http://dashboard.local/api/observability/dashboard?persona=Aluno&sessionId=privado&channel=TELEGRAM",
    ));

    expect(response.status).toBe(200);
    expect(String(fetchMock.mock.calls[0][0])).toContain("persona=Aluno");
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("sessionId");
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("channel");
  });
});
