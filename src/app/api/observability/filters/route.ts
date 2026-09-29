import { proxyJson } from "@/lib/server/pipa-client";

export async function GET(): Promise<Response> {
  return proxyJson("/api/observability/filters");
}
