"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Download, Loader2, Save, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBannerById, upsertBanner } from "@/components/ppc-banners/storage";
import { PRESET_FORMATS, type Banner, type BannerFormat } from "@/components/ppc-banners/types";
import { BannerCanvas } from "@/components/ppc-banners/banner-canvas";
import { FormatSelector } from "@/components/ppc-banners/format-selector";
import { PropertyPanel } from "@/components/ppc-banners/property-panel";
import { AIAssistant } from "@/components/ppc-banners/ai-assistant";
import { exportBannerPng } from "@/components/ppc-banners/export";

export function PpcBannerEditorClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bannerId = searchParams.get("id") || "";

  const [banner, setBanner] = useState<Banner | null>(null);
  const [activeFormatIndex, setActiveFormatIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"properties" | "ai">("properties");

  useEffect(() => {
    if (!bannerId) return;
    const loaded = getBannerById(bannerId);
    if (!loaded) return;
    setBanner(loaded);
    setActiveFormatIndex(loaded.activeFormatIndex || 0);
  }, [bannerId]);

  const activeFormat = useMemo(() => banner?.formats?.[activeFormatIndex], [banner, activeFormatIndex]);

  const save = () => {
    if (!banner) return;
    setSaving(true);
    const next: Banner = {
      ...banner,
      activeFormatIndex,
      updatedAt: new Date().toISOString(),
    };
    upsertBanner(next);
    setBanner(next);
    setSaving(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const onBannerChange = (field: keyof Banner, value: string) => {
    setBanner((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const onFormatChange = (field: keyof BannerFormat, value: number) => {
    setBanner((prev) => {
      if (!prev) return prev;
      const nextFormats = [...prev.formats];
      nextFormats[activeFormatIndex] = { ...nextFormats[activeFormatIndex], [field]: value };
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
      await exportBannerPng(banner, activeFormat);
    } catch (error) {
      console.error(error);
    }
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
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onExportCurrent} size="sm" variant="outline" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export PNG
          </Button>
          <Button onClick={save} size="sm" disabled={saving} className={saved ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"}>
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            {saved ? "Uloženo" : "Uložit"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden w-60 shrink-0 overflow-y-auto border-r border-slate-200/80 bg-white/85 p-3 backdrop-blur md:block">
          <FormatSelector formats={banner.formats} activeIndex={activeFormatIndex} onSelect={setActiveFormatIndex} onAdd={onAddFormat} onRemove={onRemoveFormat} />
        </div>

        <div className="relative flex-1 overflow-hidden bg-slate-100/60">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, #e2e8f0 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <BannerCanvas banner={banner} format={activeFormat} />
        </div>

        <div className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-slate-200/80 bg-white/85 backdrop-blur">
          <div className="m-3 flex rounded-lg bg-slate-100 p-1">
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
