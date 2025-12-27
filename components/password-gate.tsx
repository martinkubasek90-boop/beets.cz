"use client";

import { useEffect, useState } from "react";

const SESSION_KEY = "beets:gate:ok";

type PasswordGateProps = {
  children: React.ReactNode;
};

export function PasswordGate({ children }: PasswordGateProps) {
  const [authorized, setAuthorized] = useState(false);
  const [checked, setChecked] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const password = process.env.NEXT_PUBLIC_SITE_GATE_PASSWORD;

  useEffect(() => {
    const ok = sessionStorage.getItem(SESSION_KEY) === "true";
    setAuthorized(ok);
    setChecked(true);
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!password) {
      setError("Heslo brány není nastaveno.");
      return;
    }

    if (value === password) {
      sessionStorage.setItem(SESSION_KEY, "true");
      setAuthorized(true);
      setError("");
      return;
    }

    setError("Nesprávné heslo.");
  };

  if (!checked) {
    return null;
  }

  if (authorized) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_15%,rgba(0,86,63,0.35),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(243,116,51,0.35),transparent_40%),linear-gradient(145deg,#0a0f17_0%,#0c1c23_55%,#0b221d_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-50 mix-blend-screen [background:radial-gradient(circle_at_50%_50%,rgba(250,197,90,0.2),transparent_55%)]" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
        <div className="absolute left-6 top-6 flex items-center gap-3 text-white">
          <img
            src="/favicon.svg"
            alt="Beets.cz"
            className="h-10 w-10 rounded-full border border-white/15 bg-black/40 p-1"
          />
          <span className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
            Beets.cz
          </span>
        </div>
        <div className="rounded-2xl border border-[var(--mpc-accent)]/30 bg-[var(--mpc-panel)] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--mpc-accent)]">
              Beets.cz
            </p>
            <h1 className="mt-2 text-2xl font-semibold">
              Zadej heslo pro vstup
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Přístup je chráněný jedním heslem. Po zavření stránky bude třeba
              zadat heslo znovu.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm text-white/70" htmlFor="gate-pass">
              Heslo
            </label>
            <input
              id="gate-pass"
              name="gate-pass"
              type="password"
              autoComplete="current-password"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="w-full rounded-lg border border-white/15 bg-black/60 px-4 py-3 text-white outline-none transition focus:border-[var(--mpc-accent)] focus:ring-2 focus:ring-[var(--mpc-accent)]/20"
              placeholder="••••••••"
            />
            {error ? (
              <p className="text-sm text-rose-300">{error}</p>
            ) : null}
            <button
              type="submit"
              className="w-full rounded-lg bg-[linear-gradient(120deg,var(--mpc-accent),var(--mpc-accent-2))] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(243,116,51,0.35)] transition hover:opacity-90"
            >
              Odemknout
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
