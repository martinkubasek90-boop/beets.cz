import { NextResponse } from "next/server";
import { PassThrough } from "node:stream";
import archiver from "archiver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportZipBody = {
  name?: string;
  files?: Array<{
    name: string;
    dataUrl: string;
  }>;
};

function sanitizeName(value: string) {
  return value.replace(/[^\w.\-]+/g, "_");
}

function dataUrlToBuffer(dataUrl: string) {
  const split = dataUrl.split(",");
  if (split.length < 2) throw new Error("Neplatný data URL.");
  return Buffer.from(split[1], "base64");
}

async function zipToBuffer(files: Array<{ name: string; data: Buffer }>) {
  return new Promise<Buffer>((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const output = new PassThrough();
    const chunks: Buffer[] = [];

    output.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    output.on("end", () => resolve(Buffer.concat(chunks)));
    output.on("error", reject);
    archive.on("error", reject);

    files.forEach((file) => {
      archive.append(file.data, { name: file.name });
    });
    archive.pipe(output);
    void archive.finalize();
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExportZipBody;
    const input = Array.isArray(body.files) ? body.files : [];
    if (!input.length) {
      return NextResponse.json({ error: "Chybí soubory pro export." }, { status: 400 });
    }
    const files = input.map((file) => ({
      name: sanitizeName(file.name || "banner.png"),
      data: dataUrlToBuffer(file.dataUrl),
    }));
    const zipBuffer = await zipToBuffer(files);
    const zipBytes = new Uint8Array(zipBuffer);
    const baseName = sanitizeName(body.name || "banner");
    return new NextResponse(zipBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${baseName}_all-formats.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ZIP export selhal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
