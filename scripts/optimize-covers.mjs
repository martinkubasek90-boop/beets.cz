import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const MAX_SIZE = 512;
const QUALITY = 70;

const parseStorageUrl = (url) => {
  const marker = "/storage/v1/object/public/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const rest = url.slice(index + marker.length);
  const [bucket, ...parts] = rest.split("/");
  return { bucket, path: parts.join("/") };
};

const toOptimizedPath = (path) => {
  const cleaned = path.replace(/^optimized\//, "");
  return `optimized/${cleaned.replace(/\.[^/.]+$/, ".webp")}`;
};

const optimizeRow = async (table, row) => {
  const coverUrl = row.cover_url;
  if (!coverUrl) return false;
  if (coverUrl.includes("/optimized/")) return false;

  const storage = parseStorageUrl(coverUrl);
  if (!storage) return false;

  const { data: download, error: downloadError } = await supabase.storage
    .from(storage.bucket)
    .download(storage.path);
  if (downloadError || !download) {
    console.warn(`Failed download (${table} ${row.id}):`, downloadError?.message || "no data");
    return false;
  }

  const inputBuffer = Buffer.from(await download.arrayBuffer());
  const buffer = await sharp(inputBuffer)
    .resize({ width: MAX_SIZE, height: MAX_SIZE, fit: "inside" })
    .webp({ quality: QUALITY })
    .toBuffer();
  const optimizedPath = toOptimizedPath(storage.path);
  const { error: uploadError } = await supabase.storage
    .from(storage.bucket)
    .upload(optimizedPath, buffer, { contentType: "image/webp", upsert: true });

  if (uploadError) {
    console.warn(`Upload failed (${table} ${row.id}):`, uploadError.message);
    return false;
  }

  const { data } = supabase.storage.from(storage.bucket).getPublicUrl(optimizedPath);
  const { error: updateError } = await supabase
    .from(table)
    .update({ cover_url: data.publicUrl })
    .eq("id", row.id);

  if (updateError) {
    console.warn(`Update failed (${table} ${row.id}):`, updateError.message);
    return false;
  }

  return true;
};

const optimizeTable = async (table) => {
  let from = 0;
  const pageSize = 200;
  let total = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("id, cover_url")
      .not("cover_url", "is", null)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      if (await optimizeRow(table, row)) total += 1;
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return total;
};

const run = async () => {
  const beats = await optimizeTable("beats");
  const projects = await optimizeTable("projects");
  console.log(`Optimized beats: ${beats}`);
  console.log(`Optimized projects: ${projects}`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
