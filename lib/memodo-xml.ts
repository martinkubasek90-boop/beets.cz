import type { Product, ProductCategory } from "@/lib/memodo-data";

export type ParsedMemodoProduct = Product & {
  raw: Record<string, unknown>;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function textFromTag(block: string, tags: string[]) {
  for (const tag of tags) {
    const hasNamespace = tag.includes(":");
    const tagPattern = hasNamespace
      ? escapeRegExp(tag)
      : `(?:[\\w-]+:)?${escapeRegExp(tag)}`;
    const regex = new RegExp(`<${tagPattern}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagPattern}>`, "i");
    const match = regex.exec(block);
    if (match?.[1]) return decodeXmlEntities(match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  }
  return "";
}

function parseNumber(raw: string | undefined) {
  if (!raw) return undefined;
  const normalized = raw.replace(/,/g, ".").replace(/[^\d.-]/g, "");
  if (!normalized) return undefined;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
}

function parseBoolean(raw: string | undefined, fallback = true) {
  if (!raw) return fallback;
  const v = normalizeText(raw);
  if (["1", "true", "yes", "ano", "in stock", "instock", "skladem", "available"].some((s) => v.includes(s))) {
    return true;
  }
  if (["0", "false", "no", "ne", "out of stock", "outofstock", "nedostupne", "unavailable"].some((s) => v.includes(s))) {
    return false;
  }
  return fallback;
}

function normalizeCategory(raw: string): ProductCategory {
  const value = normalizeText(raw);
  if (value.includes("panel")) return "panely";
  if (value.includes("stridac") || value.includes("invertor")) return "stridace";
  if (value.includes("bateri")) return "baterie";
  if (value.includes("ems") || value.includes("management")) return "ems";
  if (value.includes("montaz")) return "montazni_systemy";
  if (value.includes("nabij")) return "nabijeci_stanice";
  if (value.includes("tepel") || value.includes("cerpad")) return "tepelna_cerpadla";
  return "prislusenstvi";
}

function extractSpecifications(block: string) {
  const specs: Record<string, string> = {};
  const paramRegex = /<param[^>]*name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/param>/gi;
  let paramMatch = paramRegex.exec(block);
  while (paramMatch) {
    const key = decodeXmlEntities(paramMatch[1]).trim();
    const value = decodeXmlEntities(paramMatch[2]).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (key && value) specs[key] = value;
    paramMatch = paramRegex.exec(block);
  }
  return specs;
}

function extractItemBlocks(xml: string) {
  const tags = ["product", "item", "PRODUCT", "SHOPITEM", "offer"];
  for (const tag of tags) {
    const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "g");
    const results: string[] = [];
    let match = regex.exec(xml);
    while (match) {
      results.push(match[0]);
      match = regex.exec(xml);
    }
    if (results.length) return results;
  }
  return [];
}

export function parseMemodoProductsFromXml(xml: string) {
  const blocks = extractItemBlocks(xml);
  const parsed: ParsedMemodoProduct[] = [];

  for (const block of blocks) {
    const externalId =
      textFromTag(block, ["external_id", "product_id", "id", "guid", "item_id", "code", "sku", "ITEM_ID"]) ||
      "";
    const name = textFromTag(block, ["name", "title", "product_name", "PRODUCTNAME", "PRODUCT"]) || "";
    const categoryRaw = textFromTag(block, ["category", "category_text", "CATEGORYTEXT", "PRODUCTNAMEEXT"]) || "";
    const brand = textFromTag(block, ["brand", "manufacturer", "producer", "MANUFACTURER"]) || undefined;
    const description =
      textFromTag(block, ["description", "short_description", "PRODUCT", "PRODUCT_DESCRIPTION"]) || undefined;
    const imageUrl = textFromTag(block, ["image_url", "image", "imgurl", "IMGURL", "url_img"]) || undefined;
    const artNumber = textFromTag(block, ["art_number", "artnum", "ean", "code", "PRODUCTNO"]) || undefined;
    const price = parseNumber(textFromTag(block, ["price", "g:price", "PRICE", "price_without_vat"]));
    const priceWithVat = parseNumber(textFromTag(block, ["price_with_vat", "price_vat", "PRICE_VAT", "priceFinal"]));
    const originalPrice = parseNumber(textFromTag(block, ["original_price", "price_old", "PRICE_OLD", "price_before"]));
    const promoLabel = textFromTag(block, ["promo_label", "label", "PROMO", "action_label"]) || undefined;
    const isPromo = parseBoolean(textFromTag(block, ["is_promo", "promo", "action", "SALE"]), false);
    const inStock = parseBoolean(textFromTag(block, ["in_stock", "availability", "delivery", "IN_STOCK"]), true);
    const category = normalizeCategory(categoryRaw || name);
    const specifications = extractSpecifications(block);

    if (!externalId || !name) continue;

    parsed.push({
      id: externalId,
      name,
      category,
      brand,
      price,
      price_with_vat: priceWithVat,
      image_url: imageUrl,
      description,
      specifications,
      art_number: artNumber,
      in_stock: inStock,
      is_promo: isPromo || (originalPrice !== undefined && price !== undefined && originalPrice > price),
      promo_label: promoLabel,
      original_price: originalPrice,
      raw: {
        externalId,
        name,
        categoryRaw,
        brand,
      },
    });
  }

  return parsed;
}

