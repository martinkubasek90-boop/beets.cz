"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Product } from "@/lib/memodo-data";
import { trackMemodoEvent } from "@/lib/memodo-analytics";
import { MemodoViewTracker } from "@/components/memodo/mobile-ux";
import { addMemodoInquiryHistoryItem, getMemodoInquiryHistory, normalizeMemodoEmail } from "@/lib/memodo-inquiry-history";

const interestOptions = [
  { value: "panely", label: "Solární panely" },
  { value: "stridace", label: "Střídače" },
  { value: "baterie", label: "Bateriová úložiště" },
  { value: "ems", label: "EMS - Energetický management" },
  { value: "montazni_systemy", label: "Montážní systémy" },
  { value: "nabijeci_stanice", label: "Nabíjecí stanice" },
  { value: "tepelna_cerpadla", label: "Tepelná čerpadla" },
  { value: "prislusenstvi", label: "Příslušenství" },
  { value: "kompletni_sestava", label: "Kompletní sestava" },
];

type FormState = {
  first_name: string;
  last_name: string;
  company: string;
  email: string;
  phone: string;
  product_interest: string;
  message: string;
  estimated_quantity: string;
  product_id: string;
  battery_id: string;
  ai_prefill: string;
};

type SavedProfile = {
  first_name: string;
  last_name: string;
  company: string;
  email: string;
  phone: string;
};

type PriceAccessResponse = {
  ok: boolean;
  canSeePrices: boolean;
  email: string | null;
};

const PROFILE_STORAGE_KEY = "memodo_profile_v1";

export default function MemodoInquiryPage() {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rememberProfile, setRememberProfile] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [historyEmail, setHistoryEmail] = useState("");
  const [historyCount, setHistoryCount] = useState(0);
  const [form, setForm] = useState<FormState>({
    first_name: "",
    last_name: "",
    company: "",
    email: "",
    phone: "",
    product_interest: "",
    message: "",
    estimated_quantity: "",
    product_id: "",
    battery_id: "",
    ai_prefill: "",
  });

  useEffect(() => {
    fetch("/api/memodo/price-access", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as PriceAccessResponse | null;
        if (!response.ok || !payload?.ok || !payload.email) return;
        const normalized = normalizeMemodoEmail(payload.email);
        setHistoryEmail(normalized);
        setHistoryCount(getMemodoInquiryHistory(normalized).length);
      })
      .catch(() => {
        // Ignore access state fetch failure here.
      });

    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw) as SavedProfile;
        setForm((prev) => ({
          ...prev,
          first_name: prev.first_name || saved.first_name || "",
          last_name: prev.last_name || saved.last_name || "",
          company: prev.company || saved.company || "",
          email: prev.email || saved.email || "",
          phone: prev.phone || saved.phone || "",
        }));
        setProfileLoaded(true);
        trackMemodoEvent("memodo_profile_prefilled");
      } catch {
        // Ignore invalid local profile payload.
      }
    }

    const params = new URLSearchParams(window.location.search);
    const productId = params.get("product") || "";
    const batteryId = params.get("set") || "";
    const prefill = params.get("prefill") || "";
    if (batteryId || prefill) {
      setForm((prev) => ({
        ...prev,
        battery_id: batteryId,
        ai_prefill: prefill,
        message: prev.message || prefill,
      }));
    }
    if (!productId) return;

    let ignore = false;
    setForm((prev) => ({ ...prev, product_id: productId }));

    fetch(`/api/memodo/products/${encodeURIComponent(productId)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { product?: Product } | null) => {
        if (ignore || !data?.product) return;
        setSelectedProduct(data.product);
        setForm((prev) => ({
          ...prev,
          product_id: productId,
          product_interest: prev.product_interest || data.product?.category || "",
        }));
      })
      .catch(() => {
        // Product lookup is optional for form submission.
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const setField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const clearSavedProfile = () => {
    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    setProfileLoaded(false);
    trackMemodoEvent("memodo_profile_cleared");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSending(true);
    trackMemodoEvent("memodo_submit_inquiry_attempt", {
      has_product_id: Boolean(form.product_id),
      has_phone: Boolean(form.phone),
      has_company: Boolean(form.company),
    });
    try {
      const contact_name = `${form.first_name} ${form.last_name}`.trim();
      const normalizedFormEmail = normalizeMemodoEmail(form.email);
      if (normalizedFormEmail) {
        try {
          await fetch("/api/memodo/price-access", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: normalizedFormEmail }),
          });
          setHistoryEmail(normalizedFormEmail);
        } catch {
          // Identity sync is best-effort and should not block inquiry submit.
        }
      }

      if (rememberProfile) {
        const profile: SavedProfile = {
          first_name: form.first_name,
          last_name: form.last_name,
          company: form.company,
          email: form.email,
          phone: form.phone,
        };
        window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
        setProfileLoaded(true);
        trackMemodoEvent("memodo_profile_saved");
        setNotice("Profilové údaje uloženy pro příští poptávku.");
      }

      const response = await fetch("/api/hubspot/memodo-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          contact_name,
          recommended_set: form.battery_id
            ? { inverterId: form.product_id || undefined, batteryId: form.battery_id }
            : undefined,
          recommended_set_text: form.ai_prefill || undefined,
          estimated_quantity: form.estimated_quantity ? Number(form.estimated_quantity) : undefined,
          sourceUrl: typeof window !== "undefined" ? window.location.href : "/Memodo/poptavka",
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Nepodařilo se odeslat poptávku.");
      }

      if (normalizedFormEmail) {
        addMemodoInquiryHistoryItem(normalizedFormEmail, {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          email: normalizedFormEmail,
          contactName: contact_name,
          company: form.company || undefined,
          phone: form.phone || undefined,
          productInterest: form.product_interest || undefined,
          productId: form.product_id || undefined,
          batteryId: form.battery_id || undefined,
          estimatedQuantity: form.estimated_quantity ? Number(form.estimated_quantity) : undefined,
          message: form.message,
        });
        setHistoryCount(getMemodoInquiryHistory(normalizedFormEmail).length);
      }

      trackMemodoEvent("memodo_submit_inquiry_success", { has_product_id: Boolean(form.product_id) });
      setNotice("Poptávka byla odeslána.");
      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Nepodařilo se odeslat poptávku.";
      trackMemodoEvent("memodo_submit_inquiry_error");
      setError(message);
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-black">Odesláno!</h2>
        <p className="mt-3 max-w-xs text-sm text-gray-500">
          Vaše poptávka byla odeslána. Ozveme se vám co nejdříve s cenovou nabídkou.
        </p>
        <Button
          onClick={() => {
            setForm({
              first_name: rememberProfile ? form.first_name : "",
              last_name: rememberProfile ? form.last_name : "",
              company: rememberProfile ? form.company : "",
              email: rememberProfile ? form.email : "",
              phone: rememberProfile ? form.phone : "",
              product_interest: "",
              message: "",
              estimated_quantity: "",
              product_id: "",
              battery_id: "",
              ai_prefill: "",
            });
            setSelectedProduct(null);
            setError("");
            setSubmitted(false);
          }}
          className="mt-8 rounded-xl bg-[#FFE500] px-10 py-5 font-bold text-black hover:bg-yellow-400"
        >
          Nová poptávka
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      {notice ? (
        <div className="mb-3 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
          {notice}
        </div>
      ) : null}
      <MemodoViewTracker page="inquiry_form" />
      <div className="mb-8">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-black tracking-tight">Poptávkový formulář</h1>
          <Link
            href="/Memodo/moje-poptavky"
            className="inline-flex min-h-[44px] items-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700"
          >
            Moje poptávky{historyCount > 0 ? ` (${historyCount})` : ""}
          </Link>
        </div>
        <p className="mt-1 text-sm text-gray-500">Rychlá poptávka do 30 vteřin. Bez závazku.</p>
        <p className="mt-1 text-xs font-semibold text-gray-500">Odpovíme obvykle do 2 hodin v pracovní době.</p>
        {historyEmail ? (
          <p className="mt-1 text-xs text-gray-500">
            Historie poptávek je vedena pro e-mail: <span className="font-semibold text-gray-700">{historyEmail}</span>
          </p>
        ) : (
          <p className="mt-1 text-xs text-gray-500">Pro historii poptávek nejdřív zadejte e-mail nahoře v aplikaci.</p>
        )}
        {profileLoaded ? (
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-semibold text-green-700">
              Údaje předvyplněny
            </span>
            <button
              type="button"
              onClick={clearSavedProfile}
              className="text-[10px] font-semibold text-gray-500 underline underline-offset-2"
            >
              Zapomenout údaje
            </button>
          </div>
        ) : null}
        {selectedProduct ? (
          <p className="mt-2 text-xs font-medium text-gray-500">
            Poptáváš produkt ID: <span className="text-gray-700">{selectedProduct.id}</span>
          </p>
        ) : null}
        {form.battery_id ? (
          <p className="mt-1 text-xs font-medium text-gray-500">
            Doporučená baterie ID: <span className="text-gray-700">{form.battery_id}</span>
          </p>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Jméno *</Label>
            <Input
              required
              value={form.first_name}
              onChange={(e) => setField("first_name", e.target.value)}
              placeholder="Jan"
              className="h-12 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Příjmení *</Label>
            <Input
              required
              value={form.last_name}
              onChange={(e) => setField("last_name", e.target.value)}
              placeholder="Novák"
              className="h-12 rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">E-mail *</Label>
          <Input
            required
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            placeholder="jan@firma.cz"
            className="h-12 rounded-xl"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="text-xs font-semibold text-gray-600 underline underline-offset-2"
        >
          {showAdvanced ? "Skrýt rozšířená pole" : "Rozšířená pole (firma, množství)"}
        </button>

        {showAdvanced ? (
          <>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Telefon</Label>
              <Input
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="+420 123 456 789"
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Oblast zájmu</Label>
              <select
                value={form.product_interest}
                onChange={(e) => setField("product_interest", e.target.value)}
                className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">Vyberte kategorii (volitelné)</option>
                {interestOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Firma</Label>
              <Input
                value={form.company}
                onChange={(e) => setField("company", e.target.value)}
                placeholder="Název firmy s.r.o."
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Odhadované množství (ks)</Label>
              <Input
                type="number"
                value={form.estimated_quantity}
                onChange={(e) => setField("estimated_quantity", e.target.value)}
                placeholder="např. 50"
                className="h-12 rounded-xl"
              />
            </div>
          </>
        ) : null}

        <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={rememberProfile}
            onChange={(e) => setRememberProfile(e.target.checked)}
            className="h-4 w-4 accent-black"
          />
          Zapamatovat moje údaje pro příště
        </label>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Zpráva / popis poptávky *</Label>
          <Textarea
            required
            value={form.message}
            onChange={(e) => setField("message", e.target.value)}
            placeholder="Popište co potřebujete - projekt, lokalita, výkon..."
            className="min-h-[120px] resize-none rounded-xl"
          />
        </div>

        <Button
          type="submit"
          disabled={sending}
          className="mt-4 w-full rounded-xl bg-[#FFE500] py-6 text-base font-black text-black shadow-lg shadow-yellow-500/20 hover:bg-yellow-400"
        >
          {sending ? "Odesílám..." : <><Send className="mr-2 h-5 w-5" /> Odeslat poptávku</>}
        </Button>
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        ) : null}
        <p className="pb-4 text-center text-xs text-gray-400">
          Odesláním souhlasíte se zpracováním osobních údajů.
        </p>
      </form>
    </div>
  );
}
