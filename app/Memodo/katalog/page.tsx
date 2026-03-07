import { MemodoCatalogPageClient } from "@/components/memodo/catalog-page-client";
import { getMemodoProducts } from "@/lib/memodo-catalog";

export const revalidate = 300;

export default async function MemodoCatalogPage() {
  const products = await getMemodoProducts();
  return <MemodoCatalogPageClient initialProducts={products} />;
}
