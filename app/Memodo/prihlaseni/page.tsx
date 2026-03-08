"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { MemodoViewTracker } from "@/components/memodo/mobile-ux";

export default function MemodoLoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/memodo/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Nepodařilo se odeslat přihlašovací odkaz.");
      }
      setSuccess("Přihlašovací odkaz byl odeslán na e-mail.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Nepodařilo se odeslat přihlašovací odkaz.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 px-4 py-6">
      <MemodoViewTracker page="price_login" />
      <h1 className="text-2xl font-black tracking-tight">Přihlášení pro zobrazení cen</h1>
      <p className="text-sm text-gray-600">
        Ceny jsou dostupné pouze schváleným partnerům. Zadej e-mail a pošleme ti přihlašovací odkaz.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
        <label className="block text-sm font-semibold text-gray-700" htmlFor="memodo-email">
          E-mail
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="memodo-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-gray-300 bg-white px-10 py-2 text-sm"
            placeholder="partner@firma.cz"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="min-h-[44px] w-full rounded-xl bg-[#FFE500] px-4 py-2 text-sm font-black text-black disabled:opacity-60"
        >
          {loading ? "Odesílám..." : "Poslat přihlašovací odkaz"}
        </button>
        {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
        {success ? <p className="text-xs font-semibold text-emerald-700">{success}</p> : null}
      </form>

      <Link href="/Memodo" className="inline-flex text-xs font-semibold text-gray-600 underline underline-offset-2">
        Zpět do aplikace
      </Link>
    </div>
  );
}
