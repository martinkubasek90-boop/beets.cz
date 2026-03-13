"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Archive, Check, Copy, Download, History, Loader2, Save, Settings, Share2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { applySnapshot, getBannerById, makeSnapshot, upsertBanner } from "@/components/ppc-banners/storage";
import { PRESET_FORMATS, type Banner, type BannerFormat } from "@/components/ppc-banners/types";
import { BannerCanvas } from "@/components/ppc-banners/banner-canvas";
import { FormatSelector } from "@/components/ppc-banners/format-selector";
import { PropertyPanel } from "@/components/ppc-banners/property-panel";
import { AIAssistant } from "@/components/ppc-banners/ai-assistant";
import { exportBannerPng, exportBannerZip, getExportFileName } from "@/components/ppc-banners/export";
import { computeChecklist, encodeSharePayload, isChecklistComplete } from "@/components/ppc-banners/banner-utils";

export function PpcBannerEditorClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bannerId = searchParams.get("id") || "";

  const [banner, setBanner] = useState<Banner | null>(null);
  const [activeFormatIndex, setActiveFormatIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autosaveTick, setAutosaveTick] = useState(0);
  const [tab, setTab] = useState<"properties" | "ai">("properties");
  const [exportScale, setExportScale] = useState<1 | 0.75 | 0.5 | 0.25>(1);
  const [emailHtmlCopied, setEmailHtmlCopied] = useState(false);

  const initDoneRef = useRef(false);

  useEffect(() => {
    if (!bannerId) return;
    const loaded = getBannerById(bannerId);
    if (!loaded) return;
    const checklist = computeChecklist(loaded);
    const normalized: Banner = {
      ...loaded,
      checklist,
      status: loaded.status === "ready" && !isChecklistComplete(checklist) ? "draft" : loaded.status || "draft",
      versions: loaded.versions || [],
      goal: loaded.goal || "traffic",
    };
    setBanner(normalized);
    setActiveFormatIndex(normalized.activeFormatIndex || 0);
    initDoneRef.current = true;
  }, [bannerId]);

  const activeFormat = useMemo(() => banner?.formats?.[activeFormatIndex], [banner, activeFormatIndex]);
  const checklist = useMemo(() => (banner ? computeChecklist(banner) : null), [banner]);
  const exportTargetSize = useMemo(() => {
    if (!activeFormat) return null;
    const w = Math.max(1, Math.round(activeFormat.width * exportScale));
    const h = Math.max(1, Math.round(activeFormat.height * exportScale));
    return { w, h };
  }, [activeFormat, exportScale]);

  const persist = (options?: { createVersion?: boolean; label?: string; autosave?: boolean }) => {
    if (!banner) return;
    setSaving(true);
    const nextChecklist = computeChecklist(banner);
    const complete = isChecklistComplete(nextChecklist);
    const now = new Date().toISOString();

    const next: Banner = {
      ...banner,
      activeFormatIndex,
      checklist: nextChecklist,
      status: complete ? banner.status || "ready" : "draft",
      autosavedAt: options?.autosave ? now : banner.autosavedAt,
      updatedAt: now,
      versions: banner.versions || [],
    };

    if (options?.createVersion) {
      const version = {
        id: `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
        label: options.label || "Ruční verze",
        savedAt: now,
        snapshot: makeSnapshot(next),
      };
      next.versions = [version, ...(next.versions || [])].slice(0, 20);
    }

    upsertBanner(next);
    setBanner(next);
    setSaving(false);
    if (!options?.autosave) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    } else {
      setAutosaveTick((prev) => prev + 1);
    }
  };

  useEffect(() => {
    if (!banner || !initDoneRef.current) return;
    const timer = window.setTimeout(() => {
      persist({ autosave: true });
    }, 900);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banner, activeFormatIndex]);

  const onBannerChange = (field: keyof Banner, value: string | number | boolean) => {
    setSaved(false);
    setBanner((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const onFormatChange = (field: keyof BannerFormat, value: string | number | boolean) => {
    setSaved(false);
    setBanner((prev) => {
      if (!prev) return prev;
      const nextFormats = [...prev.formats];
      nextFormats[activeFormatIndex] = { ...nextFormats[activeFormatIndex], [field]: value };
      return { ...prev, formats: nextFormats };
    });
  };

  const onFormatPatch = (changes: Partial<BannerFormat>) => {
    setSaved(false);
    setBanner((prev) => {
      if (!prev) return prev;
      const nextFormats = [...prev.formats];
      nextFormats[activeFormatIndex] = { ...nextFormats[activeFormatIndex], ...changes };
      return { ...prev, formats: nextFormats };
    });
  };

  const onAddFormat = (id: string) => {
    setBanner((prev) => {
      if (!prev) return prev;
      const preset = PRESET_FORMATS.find((item) => item.id === id);
      if (!preset) return prev;
      if (prev.formats.some((item) => item.id === preset.id)) return prev;
      return { ...prev, formats: [...prev.formats, preset] };
    });
  };

  const onAddCustomFormat = (format: BannerFormat) => {
    setBanner((prev) => {
      if (!prev) return prev;
      return { ...prev, formats: [...prev.formats, format] };
    });
  };

  const onRemoveFormat = (idx: number) => {
    setBanner((prev) => {
      if (!prev) return prev;
      const next = prev.formats.filter((_, i) => i !== idx);
      return { ...prev, formats: next.length ? next : [PRESET_FORMATS[0]] };
    });
    setActiveFormatIndex((prev) => Math.max(0, Math.min(prev, (banner?.formats?.length || 1) - 2)));
  };

  const onApplyAi = (changes: Partial<Record<keyof Banner, string>>) => {
    setBanner((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      (Object.keys(changes) as Array<keyof Banner>).forEach((key) => {
        const value = changes[key];
        if (typeof value === "string") (next[key] as string) = value;
      });
      return next;
    });
  };

  const onExportCurrent = async () => {
    if (!banner || !activeFormat) return;
    try {
      await exportBannerPng(banner, activeFormat, exportScale);
    } catch (error) {
      console.error(error);
    }
  };

  const onExportZip = async () => {
    if (!banner) return;
    try {
      await exportBannerZip(banner, exportScale);
    } catch (error) {
      console.error(error);
    }
  };

  const onExportEmailRetina = async () => {
    if (!banner || !activeFormat) return;
    try {
      await exportBannerPng(banner, activeFormat, 1);
      const retinaW = activeFormat.width;
      const retinaH = activeFormat.height;
      const displayW = Math.max(1, Math.round(retinaW / 2));
      const displayH = Math.max(1, Math.round(retinaH / 2));
      const filename = getExportFileName(banner.name || "banner", retinaW, retinaH);
      const alt = (banner.name || "banner").replace(/"/g, "&quot;");
      const html = `<img src="${filename}" alt="${alt}" width="${displayW}" height="${displayH}" style="display:block;width:${displayW}px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;" />`;
      await navigator.clipboard.writeText(html);
      setEmailHtmlCopied(true);
      window.setTimeout(() => setEmailHtmlCopied(false), 1800);
    } catch (error) {
      console.error(error);
    }
  };

  const onCopyShareLink = async () => {
    if (!banner) return;
    const encoded = encodeSharePayload(banner);
    const format = banner.formats[activeFormatIndex];
    const url = `${window.location.origin}/ppc-banners/preview?data=${encodeURIComponent(encoded)}${format ? `&format=${encodeURIComponent(format.id)}` : ""}`;
    try {
      await navigator.clipboard.writeText(url);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1400);
    } catch (error) {
      console.error(error);
    }
  };

  const onRestoreVersion = (versionId: string) => {
    setBanner((prev) => {
      if (!prev) return prev;
      const version = (prev.versions || []).find((item) => item.id === versionId);
      if (!version) return prev;
      const restored = applySnapshot(prev, version.snapshot);
      return {
        ...restored,
        versions: prev.versions,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  if (!banner) {
    return (
      <div className="flex h-screen items-center justify-center bg-[radial-gradient(800px_500px_at_20%_-20%,#d9f5ef_0%,#f8fafc_55%,#eef2ff_100%)]">
        <div className="text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-500" />
          <p className="mt-2 text-sm text-slate-500">Načítám banner…</p>
          <Button variant="outline" className="mt-3" onClick={() => router.push("/ppc-banners")}>
            Zpět na dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(900px_600px_at_10%_-20%,#d9f5ef_0%,#f8fafc_55%,#eef2ff_100%)] font-['Space_Grotesk',sans-serif]">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/ppc-banners">
            <Button variant="ghost" size="sm" className="h-8 text-slate-600 hover:bg-slate-100">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Zpět
            </Button>
          </Link>
          <div className="h-5 w-px bg-slate-200" />
          <Input value={banner.name} onChange={(e) => onBannerChange("name", e.target.value)} className="h-8 w-56 border-none bg-transparent shadow-none text-sm font-semibold focus-visible:ring-1" />
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${banner.status === "ready" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
            {banner.status}
          </span>
          <span key={autosaveTick} className="text-[11px] text-slate-500">Autosave aktivní</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 p-1">
            {[1, 0.75, 0.5, 0.25].map((scale) => (
              <button
                key={scale}
                type="button"
                onClick={() => setExportScale(scale as 1 | 0.75 | 0.5 | 0.25)}
                className={`rounded px-2 py-0.5 text-[11px] font-semibold ${exportScale === scale ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:bg-slate-200"}`}
                title={`Export ${Math.round(scale * 100)}%`}
              >
                {Math.round(scale * 100)}%
              </button>
            ))}
          </div>
          {exportTargetSize ? (
            <span className="text-[11px] text-slate-600">
              export: {exportTargetSize.w}x{exportTargetSize.h}
            </span>
          ) : null}
          <Button onClick={onExportCurrent} size="sm" variant="outline" className="border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            PNG
          </Button>
          <Button onClick={onExportZip} size="sm" variant="outline" className="border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200">
            <Archive className="mr-1.5 h-3.5 w-3.5" />
            ZIP
          </Button>
          <Button onClick={onExportEmailRetina} size="sm" variant="outline" className="border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200">
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            {emailHtmlCopied ? "HTML zkopírováno" : "Email Retina"}
          </Button>
          <Button onClick={onCopyShareLink} size="sm" variant="outline" className="border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200">
            <Share2 className="mr-1.5 h-3.5 w-3.5" />
            Sdílet
          </Button>
          <Button onClick={() => persist({ createVersion: true, label: "Ruční verze" })} size="sm" variant="outline" className="border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200">
            <History className="mr-1.5 h-3.5 w-3.5" />
            Uložit verzi
          </Button>
          <Button onClick={() => persist()} size="sm" disabled={saving} className={saved ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"}>
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            {saved ? "Uloženo" : "Uložit"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden w-60 shrink-0 overflow-y-auto border-r border-slate-200/80 bg-white/85 p-3 backdrop-blur md:block">
          <FormatSelector
            formats={banner.formats}
            activeIndex={activeFormatIndex}
            onSelect={setActiveFormatIndex}
            onAdd={onAddFormat}
            onAddCustom={onAddCustomFormat}
            onRemove={onRemoveFormat}
          />
        </div>

        <div className="relative flex-1 overflow-hidden bg-slate-100/60">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, #e2e8f0 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <BannerCanvas banner={banner} format={activeFormat} editable onFormatPatch={onFormatPatch} />
        </div>

        <div className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-slate-200/80 bg-white/85 backdrop-blur">
          <div className="m-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Checklist</p>
            <div className="mt-2 space-y-1">
              {checklist ? Object.entries(checklist).map(([key, ok]) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">{key}</span>
                  <span className={ok ? "text-emerald-600" : "text-red-600"}>{ok ? "OK" : "Chybí"}</span>
                </div>
              )) : null}
            </div>
            <Button
              size="sm"
              className="mt-2 w-full bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:from-emerald-700 hover:to-cyan-700"
              onClick={() => onBannerChange("status", isChecklistComplete(checklist || computeChecklist(banner)) ? "ready" : "draft")}
            >
              Označit jako {isChecklistComplete(checklist || computeChecklist(banner)) ? "Ready" : "Draft"}
            </Button>
          </div>

          <div className="mx-3 mb-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Historie verzí</p>
            <div className="mt-2 max-h-28 space-y-1 overflow-y-auto">
              {(banner.versions || []).slice(0, 8).map((version) => (
                <button
                  key={version.id}
                  type="button"
                  onClick={() => onRestoreVersion(version.id)}
                  className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-left text-[11px] text-slate-700 hover:border-cyan-300"
                >
                  <div className="font-semibold">{version.label}</div>
                  <div className="text-slate-500">{new Date(version.savedAt).toLocaleString("cs-CZ")}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="m-3 mt-0 flex rounded-lg bg-slate-100 p-1">
            <button type="button" onClick={() => setTab("properties")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${tab === "properties" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
              <Settings className="h-3.5 w-3.5" />
              Vlastnosti
            </button>
            <button type="button" onClick={() => setTab("ai")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${tab === "ai" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
              <Sparkles className="h-3.5 w-3.5" />
              AI Asistent
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {tab === "properties" ? (
              <PropertyPanel banner={banner} format={activeFormat} onBannerChange={onBannerChange} onFormatChange={onFormatChange} />
            ) : (
              <AIAssistant banner={banner} onApply={onApplyAi} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
