import { NextRequest } from "next/server";
import { queryDateRangeError } from "@/lib/observability/date-query";
import { apiErrorResponse, PipaRequestError, proxyJson } from "@/lib/server/pipa-client";

export async function GET(request: NextRequest): Promise<Response> {
  const source = request.nextUrl.searchParams;
  const error = queryDateRangeError(source);
  if (error) return apiErrorResponse(new PipaRequestError(error, 400));
  const params = new URLSearchParams();
  for (const key of ["from", "to", "aiProvider"]) {
    const value = source.get(key)?.trim();
    if (value) params.set(key, value);
  }
  const provider = params.get("aiProvider");
  if (provider && provider !== "local" && provider !== "external") {
    return apiErrorResponse(new PipaRequestError("Origem de IA deve ser local ou external.", 400));
  }
  return proxyJson("/api/observability/ai-usage", params);
}
