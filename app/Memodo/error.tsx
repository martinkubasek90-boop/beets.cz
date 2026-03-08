"use client";

import Link from "next/link";

export default function MemodoError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <div className="space-y-4 px-4 py-10 text-center">
      <h2 className="text-xl font-black text-gray-900">Něco se nepovedlo</h2>
      <p className="text-sm text-gray-500">Zkus stránku obnovit. Pokud problém trvá, pošli poptávku přímo.</p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={reset}
          className="min-h-[44px] rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900"
        >
          Zkusit znovu
        </button>
        <Link
          href="/Memodo/poptavka"
          className="min-h-[44px] rounded-xl bg-[#FFE500] px-4 py-2 text-sm font-bold text-black"
        >
          Přejít na poptávku
        </Link>
      </div>
    </div>
  );
}
