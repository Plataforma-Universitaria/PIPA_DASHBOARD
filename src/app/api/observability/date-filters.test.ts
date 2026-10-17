import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as dashboard } from "./dashboard/route";
import { GET as aiUsage } from "./ai-usage/route";
import { GET as exportData } from "./export/route";

describe.each([
  ["dashboard", dashboard], ["ai-usage", aiUsage], ["export", exportData],
] as const)("datas do BFF %s", (path, handler) => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    "from=2026-08-20T00:00:00&to=2026-08-12T23:59:59.999",
    "from=2026-02-30T00:00:00",
    "from=2026-08-12T24:00:00",
    "to=",
  ])("rejeita período inválido sem chamar o Core: %s", async (query) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await handler(new NextRequest(`http://dashboard.local/api/observability/${path}?${query}`));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("encaminha o dia completo sem perder os limites personalizados", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(Response.json({})));
    vi.stubGlobal("fetch", fetchMock);
    const query = new URLSearchParams({ from: "2026-08-12T00:00:00", to: "2026-08-12T23:59:59.999", aiProvider: "local" });
    const response = await handler(new NextRequest(`http://dashboard.local/api/observability/${path}?${query}`));
    expect(response.status).toBe(200);
    const upstream = new URL(String(fetchMock.mock.calls[0][0]));
    expect(upstream.searchParams.get("from")).toBe(query.get("from"));
    expect(upstream.searchParams.get("to")).toBe(query.get("to"));
    expect(upstream.searchParams.get("aiProvider")).toBe("local");
  });
});
