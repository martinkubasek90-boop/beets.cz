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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">
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
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/10"
              placeholder="••••••••"
            />
            {error ? (
              <p className="text-sm text-rose-300">{error}</p>
            ) : null}
            <button
              type="submit"
              className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white/90"
            >
              Odemknout
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
