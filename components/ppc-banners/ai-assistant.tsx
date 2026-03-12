"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAiVariants } from "@/components/ppc-banners/banner-utils";
import type { Banner } from "@/components/ppc-banners/types";

type ChangeMap = Partial<Record<keyof Banner, string>>;

export function AIAssistant({
  banner,
  onApply,
}: {
  banner: Banner;
  onApply: (changes: ChangeMap) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState<"performance" | "premium" | "friendly">("performance");

  const variants = createAiVariants(banner.goal || "traffic", tone, banner.brandName);

  const applyPromptAsVariant = () => {
    const value = prompt.trim();
    if (!value) return;
    onApply({
      headline: value.slice(0, 78),
      subheadline: `Kampaň zaměřená na ${banner.goal === "leads" ? "poptávky" : banner.goal === "sale" ? "prodej" : banner.goal === "remarketing" ? "remarketing" : "návštěvnost"}.`,
      ctaText: banner.ctaText || "Zjistit více",
    });
    setPrompt("");
  };

  return (
    <div className="space-y-3 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">AI Asistent (varianty copy)</p>
      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tón komunikace</label>
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value as "performance" | "premium" | "friendly")}
          className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800"
        >
          <option value="performance">Performance</option>
          <option value="premium">Premium</option>
          <option value="friendly">Friendly</option>
        </select>
      </div>
      <div className="space-y-2">
        {variants.map((variant, index) => (
          <button
            key={`${variant.headline}-${index}`}
            type="button"
            onClick={() => onApply(variant)}
            className="w-full rounded-lg border border-slate-200 bg-white p-2 text-left hover:border-cyan-300 hover:bg-cyan-50/40"
          >
            <p className="text-xs font-semibold text-slate-900">{variant.headline}</p>
            <p className="mt-1 line-clamp-2 text-[11px] text-slate-600">{variant.subheadline}</p>
            <p className="mt-1 text-[11px] font-semibold text-cyan-700">CTA: {variant.ctaText}</p>
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="border-slate-200 bg-white"
          placeholder="Vlastní prompt, např. víc technicky a B2B..."
        />
        <Button onClick={applyPromptAsVariant} className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 text-xs text-white hover:from-emerald-700 hover:to-cyan-700">
          Použít prompt
        </Button>
      </div>
    </div>
  );
}
