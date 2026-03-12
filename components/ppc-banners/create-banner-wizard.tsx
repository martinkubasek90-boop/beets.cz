"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Banner, BannerFormat } from "@/components/ppc-banners/types";
import { PRESET_FORMATS } from "@/components/ppc-banners/types";
import { getBrandKit, saveBrandKit } from "@/components/ppc-banners/storage";

function uid() {
  return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function CreateBannerWizard({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (banner: Banner) => void;
}) {
  const [name, setName] = useState("Nový PPC banner");
  const [brandName, setBrandName] = useState("BEETS.CZ");
  const [brandUrl, setBrandUrl] = useState("");
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [ctaText, setCtaText] = useState("Zjistit více");
  const [bgColor, setBgColor] = useState("#0F172A");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [ctaBg, setCtaBg] = useState("#FACC15");
  const [ctaTextColor, setCtaTextColor] = useState("#111827");
  const [logoUrl, setLogoUrl] = useState("");
  const [bgImageUrl, setBgImageUrl] = useState("");
  const [bgPrompt, setBgPrompt] = useState("");
  const [selectedFormatIds, setSelectedFormatIds] = useState<string[]>(["1200x628", "1080x1080"]);
  const [goal, setGoal] = useState<Banner["goal"]>("traffic");
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [generatingBg, setGeneratingBg] = useState(false);

  const selectedFormats = useMemo<BannerFormat[]>(
    () => PRESET_FORMATS.filter((item) => selectedFormatIds.includes(item.id)),
    [selectedFormatIds],
  );

  useEffect(() => {
    if (!open) return;
    const brandKit = getBrandKit();
    if (!brandKit) return;
    setBrandName(brandKit.brandName || "BEETS.CZ");
    setBrandUrl(brandKit.brandUrl || "");
    setLogoUrl(brandKit.logoUrl || "");
    setBgColor(brandKit.bgColor || "#0F172A");
    setTextColor(brandKit.textColor || "#FFFFFF");
    setCtaBg(brandKit.ctaBg || "#FACC15");
    setCtaTextColor(brandKit.ctaTextColor || "#111827");
  }, [open]);

  if (!open) return null;

  const toggleFormat = (id: string) => {
    setSelectedFormatIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const create = () => {
    const now = new Date().toISOString();
    const formats = selectedFormats.length ? selectedFormats : [PRESET_FORMATS[0]];
    onCreate({
      id: uid(),
      name: name.trim() || "Nový PPC banner",
      headline: headline.trim(),
      subheadline: subheadline.trim(),
      ctaText: ctaText.trim() || "Zjistit více",
      brandName: brandName.trim() || "BEETS.CZ",
      brandUrl: brandUrl.trim(),
      logoUrl: logoUrl.trim() || undefined,
      bgMode: bgImageUrl ? "upload" : bgPrompt ? "generate" : "none",
      bgColor,
      bgImageUrl: bgImageUrl || undefined,
      bgPrompt: bgPrompt || undefined,
      textColor,
      ctaBg,
      ctaTextColor,
      formats,
      activeFormatIndex: 0,
      goal,
      status: "draft",
      updatedAt: now,
      createdAt: now,
    });
    onClose();
  };

  const applyGoalTemplate = (nextGoal: Banner["goal"]) => {
    setGoal(nextGoal);
    if (nextGoal === "traffic") {
      setHeadline("Získejte víc kliknutí na vaši nabídku");
      setSubheadline("Jasná hodnota, silný vizuál a rychlá cesta na web.");
      setCtaText("Zjistit více");
      return;
    }
    if (nextGoal === "leads") {
      setHeadline("Poptávka během minuty");
      setSubheadline("Vyplňte krátký formulář a my navrhneme řešení na míru.");
      setCtaText("Chci nabídku");
      return;
    }
    if (nextGoal === "sale") {
      setHeadline("Akční nabídka připravená k objednání");
      setSubheadline("Vyberte produkt a dokončete nákup bez čekání.");
      setCtaText("Nakoupit teď");
      return;
    }
    setHeadline("Vraťte se k výběru, který vás zaujal");
    setSubheadline("Máte vybráno? Dokončete objednávku ještě dnes.");
    setCtaText("Dokončit výběr");
  };

  const storeBrandKit = () => {
    saveBrandKit({
      brandName: brandName.trim() || "BEETS.CZ",
      brandUrl: brandUrl.trim(),
      logoUrl: logoUrl.trim() || undefined,
      bgColor,
      textColor,
      ctaBg,
      ctaTextColor,
      updatedAt: new Date().toISOString(),
    });
  };

  const hydrateFromUrl = async () => {
    const input = brandUrl.trim();
    if (!input) return;
    setLoadingMetadata(true);
    try {
      const response = await fetch(`/api/ppc-banners/metadata?url=${encodeURIComponent(input)}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Metadata se nepodařilo načíst.");
      if (data.brandName) setBrandName(data.brandName);
      if (data.headline && !headline) setHeadline(data.headline);
      if (data.subheadline && !subheadline) setSubheadline(data.subheadline);
      if (data.brandUrl) setBrandUrl(data.brandUrl);
      if (data.logoUrl && !logoUrl) setLogoUrl(data.logoUrl);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMetadata(false);
    }
  };

  const onLogoUpload = async (file: File | null) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setLogoUrl(dataUrl);
  };

  const onBgUpload = async (file: File | null) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setBgImageUrl(dataUrl);
  };

  const generateBackground = async () => {
    const prompt = bgPrompt.trim();
    if (!prompt) return;
    setGeneratingBg(true);
    try {
      const response = await fetch("/api/ppc-banners/generate-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, width: 1536, height: 1024 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Generování pozadí selhalo.");
      if (data.imageUrl) setBgImageUrl(data.imageUrl);
    } catch (error) {
      console.error(error);
    } finally {
      setGeneratingBg(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 p-3 backdrop-blur-sm">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-[linear-gradient(160deg,#f8fafc_0%,#f1f5f9_65%,#ecfeff_100%)] shadow-2xl">
        <div className="mb-5 flex shrink-0 items-center justify-between p-5 pb-0 sm:p-6 sm:pb-0">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-700">New Campaign Asset</p>
            <h3 className="text-xl font-bold text-slate-900">Vytvořit PPC banner</h3>
            <p className="text-sm text-slate-600">Vyplňte základ a během chvíle máte připravenou sadu formátů.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Zavřít</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
          <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm min-w-0">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-700">Název</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="border-slate-200 bg-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Brand</Label>
                <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} className="border-slate-200 bg-white" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-slate-700">URL webu</Label>
                <div className="flex gap-2">
                  <Input value={brandUrl} onChange={(e) => setBrandUrl(e.target.value)} className="border-slate-200 bg-white" placeholder="https://beets.cz" />
                  <Button type="button" variant="outline" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-100 disabled:bg-slate-200 disabled:text-slate-500 disabled:border-slate-300" onClick={hydrateFromUrl} disabled={loadingMetadata}>
                    {loadingMetadata ? <Loader2 className="h-4 w-4 animate-spin" /> : "Načíst"}
                  </Button>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2 min-w-0">
                <Label className="text-slate-700">Cíl kampaně</Label>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <select
                    value={goal}
                    onChange={(e) => applyGoalTemplate(e.target.value as Banner["goal"])}
                    className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
                  >
                    <option value="traffic">Návštěvnost (traffic)</option>
                    <option value="leads">Poptávky (leads)</option>
                    <option value="sale">Prodej (sale)</option>
                    <option value="remarketing">Remarketing</option>
                  </select>
                  <Button type="button" variant="outline" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-100 disabled:bg-slate-200 disabled:text-slate-500 disabled:border-slate-300" onClick={() => applyGoalTemplate(goal)}>
                    Šablona textů
                  </Button>
                  <Button type="button" variant="outline" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-100 disabled:bg-slate-200 disabled:text-slate-500 disabled:border-slate-300" onClick={storeBrandKit}>
                    Uložit brand kit
                  </Button>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-slate-700">Headline</Label>
                <Textarea value={headline} onChange={(e) => setHeadline(e.target.value)} className="min-h-[96px] border-slate-200 bg-white text-slate-900 placeholder:text-slate-400" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-slate-700">Subheadline</Label>
                <Textarea value={subheadline} onChange={(e) => setSubheadline(e.target.value)} className="min-h-[88px] border-slate-200 bg-white text-slate-900 placeholder:text-slate-400" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">CTA</Label>
                <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} className="border-slate-200 bg-white" />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">Logo URL</Label>
                <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="border-slate-200 bg-white" placeholder="https://.../logo.png" />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">Nahrát logo</Label>
                <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <Upload className="h-4 w-4" />
                  Vybrat soubor
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => void onLogoUpload(e.target.files?.[0] || null)} />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-slate-700">BG</Label>
                  <Input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-11 border-slate-200 bg-white p-1.5" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">Text</Label>
                  <Input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-11 border-slate-200 bg-white p-1.5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-slate-700">CTA BG</Label>
                  <Input type="color" value={ctaBg} onChange={(e) => setCtaBg(e.target.value)} className="h-11 border-slate-200 bg-white p-1.5" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">CTA Text</Label>
                  <Input type="color" value={ctaTextColor} onChange={(e) => setCtaTextColor(e.target.value)} className="h-11 border-slate-200 bg-white p-1.5" />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-slate-700">Pozadí URL (image)</Label>
                <Input value={bgImageUrl} onChange={(e) => setBgImageUrl(e.target.value)} className="border-slate-200 bg-white" placeholder="https://.../background.jpg" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-slate-700">Nahrát pozadí</Label>
                <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <Upload className="h-4 w-4" />
                  Vybrat obrázek
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => void onBgUpload(e.target.files?.[0] || null)} />
                </label>
              </div>

              <div className="space-y-2 md:col-span-2 min-w-0">
                <Label className="text-slate-700">Prompt pro AI pozadí (free tier)</Label>
                <div className="flex gap-2">
                  <Input value={bgPrompt} onChange={(e) => setBgPrompt(e.target.value)} className="border-slate-200 bg-white" placeholder="např. clean modern abstract gradient for fintech ad banner" />
                  <Button type="button" onClick={generateBackground} disabled={generatingBg || !bgPrompt.trim()} className="bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:from-emerald-700 hover:to-cyan-700 disabled:opacity-100 disabled:bg-slate-200 disabled:text-slate-500 disabled:from-slate-200 disabled:to-slate-200">
                    {generatingBg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 min-w-0">
            <div className="rounded-2xl border border-cyan-200/70 bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Živý náhled stylu</p>
              <div className="rounded-xl bg-cover bg-center p-4" style={{ backgroundColor: bgColor, backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : undefined }}>
                <div className="mb-2 flex items-center gap-2">
                  {logoUrl ? <img src={logoUrl} alt="Logo" className="h-6 w-auto max-w-[100px] object-contain" /> : null}
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-90" style={{ color: textColor }}>
                    {brandName || "BEETS.CZ"}
                  </p>
                </div>
                <p className="mt-2 text-lg font-bold leading-tight" style={{ color: textColor }}>
                  {headline || "Váš headline se zobrazí tady"}
                </p>
                <p className="mt-2 text-sm" style={{ color: textColor }}>
                  {subheadline || "Krátké doplnění hodnoty pro kliknutí."}
                </p>
                <span className="mt-4 inline-block rounded-lg px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: ctaBg, color: ctaTextColor }}>
                  {ctaText || "Zjistit více"}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Formáty</p>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_FORMATS.map((format) => {
                  const active = selectedFormatIds.includes(format.id);
                  return (
                    <button
                      key={format.id}
                      type="button"
                      onClick={() => toggleFormat(format.id)}
                      className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                        active
                          ? "border-cyan-500 bg-cyan-50 text-cyan-900 shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-semibold">{format.name}</div>
                      <div className={active ? "text-cyan-700" : "text-slate-500"}>{format.width}x{format.height}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        </div>
        <div className="mt-6 flex shrink-0 justify-end gap-2 border-t border-slate-200/70 p-5 sm:p-6">
          <Button variant="outline" onClick={onClose} className="border-slate-300 bg-white/80 text-slate-700 hover:bg-white disabled:opacity-100 disabled:bg-slate-200 disabled:text-slate-500 disabled:border-slate-300">Zrušit</Button>
          <Button onClick={create} className="bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:from-emerald-700 hover:to-cyan-700">Vytvořit banner</Button>
        </div>
      </div>
    </div>
  );
}
