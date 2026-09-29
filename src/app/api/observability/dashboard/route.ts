import { NextRequest } from "next/server";
import { pickObservabilityFilters } from "@/lib/observability/query";
import { proxyJson } from "@/lib/server/pipa-client";

export async function GET(request: NextRequest): Promise<Response> {
  return proxyJson(
    "/api/observability/dashboard",
    pickObservabilityFilters(request.nextUrl.searchParams),
  );
}
