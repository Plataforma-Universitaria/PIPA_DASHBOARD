import { Dashboard } from "@/components/dashboard/dashboard";
import { createFilterState } from "@/lib/observability/date-range";

type PageSearchParams = Record<string, string | string[] | undefined>;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const rawParams = await searchParams;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(rawParams)) {
    const normalized = Array.isArray(value) ? value[0] : value;
    if (normalized !== undefined) params.set(key, normalized);
  }

  return <Dashboard initialFilters={createFilterState(params)} />;
}
