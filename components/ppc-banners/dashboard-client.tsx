"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LayoutGrid, Plus, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BannerCard } from "@/components/ppc-banners/banner-card";
import { CreateBannerWizard } from "@/components/ppc-banners/create-banner-wizard";
import { deleteBanner, duplicateBanner, listBanners, upsertBanner } from "@/components/ppc-banners/storage";
import type { Banner } from "@/components/ppc-banners/types";
import { exportBannerPng, exportBannerZip } from "@/components/ppc-banners/export";

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
    const copy = duplicateBanner(banner);
    if (!copy) return;
    setBanners(listBanners());
    setRefreshKey((prev) => prev + 1);
  };

  const onCreate = (banner: Banner) => {
    upsertBanner(banner);
    setRefreshKey((prev) => prev + 1);
  };

  const onExport = async (banner: Banner) => {
    const target = banner.formats?.[0];
    if (!target) return;
    try {
      await exportBannerPng(banner, target);
    } catch (error) {
      console.error(error);
    }
  };

  const onExportZip = async (banner: Banner) => {
    try {
      await exportBannerZip(banner);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_700px_at_10%_-10%,#d9f5ef_0%,#f8fafc_45%,#eef2ff_100%)] font-['Space_Grotesk',sans-serif]">
      <div className="border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-7">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg shadow-cyan-500/30">
                <LayoutGrid className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">BEETS Creative Suite</p>
                <h1 className="text-2xl font-bold leading-tight text-slate-900">PPC Banner Studio</h1>
                <p className="text-sm text-slate-600">Navrhujte výkonné bannery rychle, konzistentně a bez chaosu.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/">
                <Button variant="outline" className="border-slate-300 bg-white/70 text-slate-700 hover:bg-white disabled:opacity-100 disabled:bg-slate-200 disabled:text-slate-500 disabled:border-slate-300">Domů</Button>
              </Link>
              <Button onClick={() => setWizardOpen(true)} className="bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:from-emerald-700 hover:to-cyan-700 shadow-lg shadow-cyan-500/30">
                <Plus className="mr-2 h-4 w-4" />
                Nový banner
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur sm:p-5">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 border-slate-200/90 bg-white pl-10" placeholder="Hledat bannery podle názvu nebo headline..." />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/80 bg-white/80 py-20 text-center shadow-sm backdrop-blur">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-cyan-100">
              <Sparkles className="h-7 w-7 text-cyan-700" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-slate-800">
              {search ? "Žádné výsledky" : "Zatím žádné bannery"}
            </h3>
            <p className="mb-6 text-sm text-slate-600">
              {search ? "Zkuste jiný hledaný výraz" : "Vytvořte svůj první PPC banner"}
            </p>
            {!search ? (
              <Button onClick={() => setWizardOpen(true)} className="bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:from-emerald-700 hover:to-cyan-700">
                <Plus className="mr-2 h-4 w-4" />
                Vytvořit banner
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((banner) => (
              <BannerCard key={banner.id} banner={banner} onDelete={onDelete} onDuplicate={onDuplicate} onExport={onExport} onExportZip={onExportZip} />
            ))}
          </div>
        )}
      </div>

      <CreateBannerWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onCreate={onCreate} />
    </div>
  );
}
