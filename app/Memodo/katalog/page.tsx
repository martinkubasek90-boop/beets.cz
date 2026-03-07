import { MemodoCatalogPageClient } from "@/components/memodo/catalog-page-client";

export const revalidate = 300;

export default async function MemodoCatalogPage() {
  return <MemodoCatalogPageClient />;
}
