import { MemodoCatalogPageClient } from "@/components/memodo/catalog-page-client";
import { getMemodoAdminConfig } from "@/lib/memodo-admin-config";

export const revalidate = 300;

export default async function MemodoCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const config = await getMemodoAdminConfig();
  return (
    <MemodoCatalogPageClient
      requiresSearch={config.catalogRequiresSearch}
      initialCategory={params.category || ""}
      initialSearch={params.q || ""}
    />
  );
}
