import { NextRequest } from "next/server";
import { pickObservabilityFilters } from "@/lib/observability/query";
import {
  apiErrorResponse,
  PipaRequestError,
  requestPipa,
  safeDownloadFilename,
} from "@/lib/server/pipa-client";

export async function GET(request: NextRequest): Promise<Response> {
  const requestedFormat = request.nextUrl.searchParams.get("format")?.toLowerCase() ?? "csv";
  if (requestedFormat !== "csv" && requestedFormat !== "pdf") {
    return apiErrorResponse(new PipaRequestError("Formato deve ser csv ou pdf.", 400));
  }

  const params = pickObservabilityFilters(request.nextUrl.searchParams);
  params.set("format", requestedFormat);

  try {
    const upstream = await requestPipa("/api/observability/export", params, 30_000);
    const extension = requestedFormat as "csv" | "pdf";
    const filename = safeDownloadFilename(
      upstream.headers.get("Content-Disposition"),
      extension,
    );
    return new Response(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("Content-Type")
          ?? (extension === "pdf" ? "application/pdf" : "text/csv; charset=UTF-8"),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
