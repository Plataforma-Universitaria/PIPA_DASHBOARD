import { NextResponse } from "next/server";

const DEFAULT_TIMEOUT_MS = 10_000;

export class PipaRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "PipaRequestError";
  }
}

function pipaBaseUrl(): string {
  const configured = process.env.PIPA_API_URL ?? "http://localhost:8081";
  const parsed = new URL(configured);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new PipaRequestError("Configuração inválida do PIPA Core.", 500);
  }
  return parsed.toString().replace(/\/$/, "");
}

export async function requestPipa(
  path: string,
  params = new URLSearchParams(),
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const url = new URL(`${pipaBaseUrl()}${path}`);
  url.search = params.toString();

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json, text/csv, application/pdf" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      throw new PipaRequestError(
        response.status >= 500
          ? "O PIPA Core está temporariamente indisponível."
          : "O PIPA Core rejeitou a solicitação.",
        response.status >= 500 ? 502 : response.status,
      );
    }
    return response;
  } catch (error) {
    if (error instanceof PipaRequestError) throw error;
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new PipaRequestError("O PIPA Core demorou para responder.", 504);
    }
    throw new PipaRequestError("Não foi possível conectar ao PIPA Core.", 502);
  }
}

export function apiErrorResponse(error: unknown): NextResponse {
  const normalized = error instanceof PipaRequestError
    ? error
    : new PipaRequestError("Não foi possível concluir a solicitação.", 500);
  return NextResponse.json(
    { message: normalized.message },
    { status: normalized.status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function proxyJson(
  path: string,
  params = new URLSearchParams(),
): Promise<Response> {
  try {
    const upstream = await requestPipa(path, params);
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export function safeDownloadFilename(
  contentDisposition: string | null,
  extension: "csv" | "pdf",
): string {
  const match = contentDisposition?.match(/filename="?([^";]+)"?/i);
  const candidate = match?.[1]?.replace(/[^a-zA-Z0-9._-]/g, "_");
  return candidate?.toLowerCase().endsWith(`.${extension}`)
    ? candidate
    : `observabilidade.${extension}`;
}
