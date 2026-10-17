import { NextRequest } from "next/server";
import { pickObservabilityFilters } from "@/lib/observability/query";
import { apiErrorResponse, PipaRequestError, proxyJson } from "@/lib/server/pipa-client";
import { queryDateRangeError } from "@/lib/observability/date-query";

export async function GET(request: NextRequest): Promise<Response> {
  const error = queryDateRangeError(request.nextUrl.searchParams);
  if (error) return apiErrorResponse(new PipaRequestError(error, 400));
  return proxyJson(
    "/api/observability/dashboard",
    pickObservabilityFilters(request.nextUrl.searchParams),
  );
}
