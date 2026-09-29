import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("export route", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("rejeita formato desconhecido sem chamar o Core", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(new NextRequest(
      "http://dashboard.local/api/observability/export?format=xlsx",
    ));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserva binário, tipo e nome seguro do download", async () => {
    const bytes = new Uint8Array([37, 80, 68, 70]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="observabilidade-2026-08-30.pdf"',
      },
    })));

    const response = await GET(new NextRequest(
      "http://dashboard.local/api/observability/export?format=pdf&persona=Aluno&sessionId=privado",
    ));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition"))
      .toBe('attachment; filename="observabilidade-2026-08-30.pdf"');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
  });
});
