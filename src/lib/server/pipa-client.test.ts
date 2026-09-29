import { afterEach, describe, expect, it, vi } from "vitest";
import {
  apiErrorResponse,
  PipaRequestError,
  proxyJson,
  requestPipa,
  safeDownloadFilename,
} from "./pipa-client";

describe("PIPA BFF client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("usa URL server-side e desabilita cache", async () => {
    vi.stubEnv("PIPA_API_URL", "http://core.local:8081/");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await requestPipa(
      "/api/observability/dashboard",
      new URLSearchParams({ persona: "Aluno" }),
    );

    expect(response.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "http://core.local:8081/api/observability/dashboard?persona=Aluno",
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
  });

  it("normaliza indisponibilidade sem repassar corpo upstream", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("stack trace secreto", { status: 503 }),
    ));

    const response = await proxyJson("/api/observability/dashboard");

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      message: "O PIPA Core está temporariamente indisponível.",
    });
  });

  it("distingue timeout de falha de conexão", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("tempo", "TimeoutError")));

    await expect(requestPipa("/api/observability/filters")).rejects.toMatchObject({
      status: 504,
      message: "O PIPA Core demorou para responder.",
    });
  });

  it("produz erro JSON estável e filename seguro", async () => {
    const response = apiErrorResponse(new PipaRequestError("inválido", 400));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "inválido" });
    expect(safeDownloadFilename('attachment; filename="relatório perigoso.pdf"', "pdf"))
      .toBe("relat_rio_perigoso.pdf");
    expect(safeDownloadFilename("attachment", "csv")).toBe("observabilidade.csv");
  });
});
