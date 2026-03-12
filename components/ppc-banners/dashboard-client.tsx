"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LayoutGrid, Plus, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BannerCard } from "@/components/ppc-banners/banner-card";
import { CreateBannerWizard } from "@/components/ppc-banners/create-banner-wizard";
import { deleteBanner, listBanners, upsertBanner } from "@/components/ppc-banners/storage";
import type { Banner } from "@/components/ppc-banners/types";

export function PpcBannersDashboardClient() {
  const [search, setSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    setBanners(listBanners());
  }, [refreshKey]);

  const filtered = useMemo(
    () =>
      banners.filter(
        (item) =>
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.headline.toLowerCase().includes(search.toLowerCase()),
      ),
    [banners, search],
  );

  const onDelete = (id: string) => {
    deleteBanner(id);
    setRefreshKey((prev) => prev + 1);
  };

  const onDuplicate = (banner: Banner) => {
    const now = new Date().toISOString();
    const copy: Banner = {
      ...banner,
      id: `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      name: `${banner.name} (kopie)`,
      createdAt: now,
      updatedAt: now,
    };
    upsertBanner(copy);
    setRefreshKey((prev) => prev + 1);
  };

  const onCreate = (banner: Banner) => {
    upsertBanner(banner);
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-lg shadow-blue-500/20">
                <LayoutGrid className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">PPC Banner Studio</h1>
                <p className="text-sm text-slate-500">Vytvářejte bannery s AI asistentem</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/">
                <Button variant="outline">Domů</Button>
              </Link>
              <Button onClick={() => setWizardOpen(true)} className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700">
                <Plus className="mr-2 h-4 w-4" />
                Nový banner
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 bg-white pl-10" placeholder="Hledat bannery..." />
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <Sparkles className="h-7 w-7 text-slate-400" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-slate-700">
              {search ? "Žádné výsledky" : "Zatím žádné bannery"}
            </h3>
            <p className="mb-6 text-sm text-slate-500">
              {search ? "Zkuste jiný hledaný výraz" : "Vytvořte svůj první PPC banner"}
            </p>
            {!search ? (
              <Button onClick={() => setWizardOpen(true)} className="bg-gradient-to-r from-blue-600 to-violet-600">
                <Plus className="mr-2 h-4 w-4" />
                Vytvořit banner
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((banner) => (
              <BannerCard key={banner.id} banner={banner} onDelete={onDelete} onDuplicate={onDuplicate} />
            ))}
          </div>
        )}
      </div>

      <CreateBannerWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onCreate={onCreate} />
    </div>
  );
}
