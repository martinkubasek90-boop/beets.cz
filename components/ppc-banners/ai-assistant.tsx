"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const applyPreset = (mode: "direct" | "urgent" | "premium" | "simple") => {
    if (mode === "direct") {
      onApply({
        headline: "Výkonnější energie bez kompromisů",
        subheadline: "Řešení pro instalátory, kteří chtějí rychlost i spolehlivost.",
        ctaText: "Zobrazit nabídku",
      });
      return;
    }
    if (mode === "urgent") {
      onApply({
        headline: "Akce platí jen omezeně",
        subheadline: "Zajistěte cenu ještě dnes a zrychlete realizaci projektu.",
        ctaText: "Chci cenu teď",
      });
      return;
    }
    if (mode === "premium") {
      onApply({
        headline: "Prémiové komponenty pro náročné projekty",
        subheadline: "Vysoká dostupnost, technická podpora a férové B2B podmínky.",
        ctaText: "Vyžádat nabídku",
      });
      return;
    }
    onApply({
      headline: "Rychlá poptávka, jasná cena",
      subheadline: "Vyberte produkt a získejte nabídku během pár chvil.",
      ctaText: "Poptat nyní",
    });
  };

  const applyPrompt = () => {
    const value = prompt.trim();
    if (!value) return;
    onApply({
      headline: value.slice(0, 74),
      subheadline: banner.subheadline || "Vytvořeno podle vašeho zadání.",
    });
    setPrompt("");
  };

  return (
    <div className="space-y-3 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI Asistent (rychlé akce)</p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="text-xs" onClick={() => applyPreset("direct")}>Přímé sdělení</Button>
        <Button variant="outline" className="text-xs" onClick={() => applyPreset("urgent")}>Urgence</Button>
        <Button variant="outline" className="text-xs" onClick={() => applyPreset("premium")}>Premium</Button>
        <Button variant="outline" className="text-xs" onClick={() => applyPreset("simple")}>Jednoduše</Button>
      </div>
      <div className="space-y-2">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Napište instrukci, např. více technicky..."
        />
        <Button onClick={applyPrompt} className="w-full text-xs">
          Použít prompt
        </Button>
      </div>
    </div>
  );
}

