"use client";

import { MainNav } from "@/components/main-nav";

export const metadata = {
  title: 'Spolupráce | BEETS.CZ',
  description: 'Jak fungují spolupráce na BEETS.CZ a proč dává smysl je řešit přímo na platformě.',
};

const steps = [
  {
    title: 'Zaregistruješ se a vyplníš profil',
    body: 'Základní info, žánr, ukázky tvorby. Ať ostatní hned vidí, s kým mají tu čest.',
  },
  {
    title: 'Najdeš umělce, se kterým chceš spolupracovat',
    body: 'Prohledáš podle žánru, města, typu tvorby nebo jména.',
  },
  {
    title: 'Pošleš žádost o spolupráci',
    body: 'Přímo z profilu odešleš žádost – ideálně s krátkou zprávou (hostovačka, beaty, vokály, mix, vizuál…).',
  },
  {
    title: 'Druhému umělci přijde notifikace',
    body: 'V rámci platformy dostane upozornění, že má novou žádost, a propíše se mu do profilu.',
  },
  {
    title: 'Domluvíte se na detailech',
    body: 'Reaguje, domluvíte podmínky a můžete spustit jednorázový track i dlouhodobý projekt.',
  },
];

const reasons = [
  {
    title: 'Všechno na jednom místě',
    body: 'Profil, tvorba, kontakt i spolupráce – nic se nerozpadá mezi sítěmi a messengerem.',
  },
  {
    title: 'Relevantní oslovení',
    body: 'Oslovuješ konkrétního umělce s jasným stylem a portfoliem. Šetříš čas sobě i jemu.',
  },
  {
    title: 'Transparentní historie',
    body: 'Spolupráce se promítají do profilu osloveného umělce. Je vidět, kdo s kým pracuje a jak je aktivní.',
  },
  {
    title: 'Přesun dat',
    body: 'Soubory pro tvorbu spolupráce můžeš nahrávat, sdílet a stahovat přímo v platformě.',
  },
  {
    title: 'Komunita místo anonymních zpráv',
    body: 'Spolupracují lidé, kteří do platformy investovali čas a vybudovali profil. Filtruje to náhodné a nerelevantní kontakty.',
  },
];

export default function CollabsPage() {
  return (
    <main className="min-h-screen bg-black text-white" id="collabs">
      <MainNav />
      <section className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12">
        <div className="flex justify-end">
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white hover:border-[var(--mpc-accent)]"
          >
            ← Zpět na homepage
          </a>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/5 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
          <p className="text-[12px] uppercase tracking-[0.14em] text-[var(--mpc-muted)]">Co jsou spolupráce na beets.cz</p>
          <h1 className="mt-2 text-3xl font-semibold">Spolupráce bez chaosu</h1>
          <p className="mt-3 text-[15px] text-[var(--mpc-muted)]">
            Spolupráce na beets.cz znamená, že jeden umělec osloví druhého přímo přes platformu a odešle mu žádost o spolupráci.
            Všechno zůstává přehledně uvnitř vašich profilů – bez ztracených zpráv, anonymních kontaktů a chaotické domluvy přes pět různých kanálů.
          </p>
          <div className="mt-4 space-y-2 text-[15px] text-[var(--mpc-muted)]">
            <p><strong>Umělec A</strong> → pošle žádost umělci B</p>
            <p><strong>Umělec B</strong> → dostane jasnou notifikaci a vidí, kdo a s čím ho oslovuje</p>
            <p><strong>Spolupráce</strong> → propíše se do profilu osloveného umělce</p>
            <p>
              Díky tomu má každý umělec pod kontrolou, kdo ho kontaktuje, kvůli čemu a jaké spolupráce má aktuálně rozjednané.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_12px_28px_rgba(0,0,0,0.3)]">
            <h2 className="text-xl font-semibold">Pouze pro registrované umělce</h2>
            <p className="mt-2 text-sm text-[var(--mpc-muted)]">
              Spolupráce jsou funkcí pro uživatele, kteří to myslí vážně. Vytvořit i přijmout spolupráci může jen registrovaný uživatel
              s profilem. Výsledek: žádné anonymní zprávy, ale konkrétní profil, tvorba a historie aktivit.
            </p>
            <p className="mt-2 text-sm text-[var(--mpc-muted)]">
              Když ti někdo napíše, víš přesně kdo to je.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_12px_28px_rgba(0,0,0,0.3)]">
            <h2 className="text-xl font-semibold">Jak spolupráce funguje (krok za krokem)</h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--mpc-muted)]">
              {steps.map((step) => (
                <li key={step.title}>
                  <strong>{step.title}:</strong> {step.body}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_12px_28px_rgba(0,0,0,0.3)]">
          <h2 className="text-2xl font-semibold">Proč spolupráce přes beets.cz dávají smysl</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {reasons.map((reason) => (
              <div key={reason.title} className="rounded-xl border border-white/10 bg-black/30 p-4">
                <h3 className="text-lg font-semibold">{reason.title}</h3>
                <p className="mt-2 text-sm text-[var(--mpc-muted)]">{reason.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--mpc-accent)]/40 bg-[var(--mpc-accent)]/10 p-6 text-center shadow-[0_12px_28px_rgba(243,116,51,0.25)]">
          <h2 className="text-2xl font-semibold">Začni navazovat spolupráce</h2>
          <p className="mt-3 text-sm text-[var(--mpc-muted)]">
            Chceš oslovit producenta, zpěváka, rappera, instrumentalistu, mix/master nebo vizuál? Začni tím, že si vytvoříš profil na
            beets.cz a ukážeš, co děláš.
          </p>
          <div className="mt-4 grid gap-2 text-sm text-[var(--mpc-muted)]">
            <span>Vytvoř si účet</span>
            <span>Nastav profil</span>
            <span>Najdi umělce, který tě zajímá</span>
            <span>Pošli mu žádost o spolupráci</span>
          </div>
          <p className="mt-3 text-sm text-[var(--mpc-muted)]">
            Ať je na první pohled vidět, že to se svojí tvorbou myslíš vážně.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a
              href="/auth/sign-up"
              className="rounded-full border border-white/20 bg-[var(--mpc-accent)] px-5 py-3 text-[12px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_12px_28px_rgba(243,116,51,0.35)]"
            >
              Vytvořit účet
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
