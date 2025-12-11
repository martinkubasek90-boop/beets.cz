import Link from "next/link";

export const metadata = {
  title: 'Komunita | BEETS.CZ',
  description: 'Jak funguje kurátorovaná komunita BEETS.CZ a jak se zapojit.',
};

export default function KomunitaPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12">
        <div className="flex justify-end">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white hover:border-[var(--mpc-accent)]"
          >
            ← Zpět na homepage
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-black via-black/70 to-[#0f0f0f] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-3 text-left">
            <p className="text-[12px] uppercase tracking-[0.14em] text-[var(--mpc-muted)]">Komunita</p>
            <h1 className="text-3xl font-semibold leading-tight">Jak BEETS.CZ funguje</h1>
            <p className="max-w-3xl text-[15px] text-[var(--mpc-muted)]">
              Kurátorovaná platforma pro beatmakery a spolupráce. Nahraješ beaty nebo akapely, nastavíš viditelnost a můžeš
              domlouvat spolupráce přímo v aplikaci. Bez reklam a rušení.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: '1) Vytvoř profil',
              body: 'Registrace, doplnění display name, avataru a pár základních info.',
            },
            {
              title: '2) Nahraj obsah',
              body: 'Beaty nebo akapely. Každý projekt má krycí obrázek a nastavíš, jestli je veřejný nebo na žádost.',
            },
            {
              title: '3) Spolupráce',
              body: 'U projektů na žádost mohou ostatní poslat žádost o přístup; ty ji schválíš nebo odmítneš.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-[0_12px_28px_rgba(0,0,0,0.3)]"
            >
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-[var(--mpc-muted)]">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-semibold">Pravidla v kostce</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--mpc-muted)]">
            <li>• Respekt a férová domluva; žádné spamování ani nevyžádané zprávy.</li>
            <li>• Audio, které nahráváš, musíš vlastnit nebo mít práva k jeho sdílení.</li>
            <li>• Projekty můžeš nastavit jako veřejné, nebo na žádost (přístup schvaluješ ty).</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-[var(--mpc-accent)]/40 bg-[var(--mpc-accent)]/10 p-6 text-center shadow-[0_12px_28px_rgba(243,116,51,0.25)]">
          <h3 className="text-xl font-semibold">Chceš se přidat?</h3>
          <p className="mt-2 text-sm text-[var(--mpc-muted)]">
            Založ si účet, nahraj první beat nebo akapelu a vyzkoušej žádost o spolupráci.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <a
              href="/auth/sign-up"
              className="rounded-full border border-white/20 bg-[var(--mpc-accent)] px-5 py-3 text-[12px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_12px_28px_rgba(243,116,51,0.35)]"
            >
              Registrace
            </a>
            <a
              href="/auth/login"
              className="rounded-full border border-white/20 bg-white/5 px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-white hover:border-[var(--mpc-accent)]"
            >
              Přihlásit se
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
