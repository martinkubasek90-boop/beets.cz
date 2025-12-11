'use client';

import Link from 'next/link';
import { MainNav } from '@/components/main-nav';

export default function PodminkyPage() {
  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#050505)] text-white">
      <MainNav />
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted,#8a8a8a)]">Podmínky užití</p>
          <h1 className="text-3xl font-bold uppercase tracking-[0.12em]">Beets.cz</h1>
          <p className="text-sm text-[var(--mpc-muted,#8a8a8a)]">
            Používáním platformy souhlasíš s níže uvedenými podmínkami.
          </p>
        </header>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-[var(--mpc-light,#e5e7eb)] shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">1. Úvodní ustanovení</h2>
            <p>Tyto Podmínky užití (“Podmínky”) upravují používání platformy Beets.cz (“Platforma”), kterou provozuje Martin Kubásek. Používáním Platformy uživatel potvrzuje, že se s Podmínkami seznámil a souhlasí s nimi.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">2. Registrace a uživatelský účet</h2>
            <p>Platformu mohou používat pouze registrovaní uživatelé.</p>
            <p>Uživatel je povinen uvádět pravdivé údaje a chránit své přihlašovací údaje před zneužitím.</p>
            <p>Provozovatel může účet uživatele zrušit v případě porušení Podmínek nebo zneužití Platformy.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">3. Obsah uživatelů (audio, texty, profily)</h2>
            <p>Veškerý obsah nahraný uživatelem, zejména audio nahrávky, texty, popisy, fotografie či jiná tvorba (“Uživatelský obsah”), zůstává výhradním vlastnictvím uživatele.</p>
            <p>Nahráním obsahu na Platformu uživatel poskytuje nevýhradní, časově omezenou licenci pouze pro účely zobrazení, streamování a zpřístupnění obsahu v rámci Platformy Beets.cz.</p>
            <p>Provozovatel nezískává žádná práva k užívání obsahu mimo Platformu, nesmí jej kopírovat, šířit, poskytovat třetím osobám ani komerčně využívat.</p>
            <p>Uživatel odpovídá za to, že nahraný obsah neporušuje autorská práva ani práva třetích osob.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">4. Ochrana autorů</h2>
            <p>Každý umělec a uživatel, který nahraje audio nebo jinou tvorbu, zůstává držitelem autorských práv k dílu.</p>
            <p>Beets.cz slouží pouze jako platforma pro prezentaci a vzájemné propojení tvůrců.</p>
            <p>Platforma neuplatňuje žádná vlastnická ani licenční práva nad obsahem uživatelů, kromě nezbytného technického zpřístupnění.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">5. Komunikace a volání mezi uživateli</h2>
            <p>Platforma může umožnit hlasové hovory nebo videohovory mezi uživateli prostřednictvím externích služeb (např. Jitsi).</p>
            <p>Provozovatel nenese odpovědnost za technickou funkčnost těchto služeb ani za obsah komunikace mezi uživateli.</p>
            <p>Uživatelé se zavazují chovat se slušně, respektovat ostatní a neporušovat zákony.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">6. Zakázané chování</h2>
            <p>Uživatel nesmí:</p>
            <ul className="list-disc space-y-1 pl-5 text-[var(--mpc-muted,#9ca3af)]">
              <li>zveřejňovat obsah porušující práva třetích osob,</li>
              <li>šířit nenávistný, urážlivý či nelegální obsah,</li>
              <li>pokoušet se narušit provoz Platformy,</li>
              <li>zneužívat profily jiných uživatelů nebo jejich tvorbu.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">7. Odpovědnost</h2>
            <p>Provozovatel neodpovídá za obsah nahraný uživateli.</p>
            <p>Uživatel nese odpovědnost za svůj obsah a chování.</p>
            <p>Platforma může být kdykoli změněna, doplněna nebo dočasně nedostupná.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">8. Ukončení užívání</h2>
            <p>Uživatel může svůj účet kdykoli zrušit.</p>
            <p>Provozovatel může zrušit účet při porušení Podmínek nebo při zneužití funkcí.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">9. Zpracování osobních údajů</h2>
            <p>Platforma zpracovává osobní údaje v souladu s GDPR. Podrobnosti jsou uvedeny v dokumentu Zásady ochrany osobních údajů.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">10. Závěrečná ustanovení</h2>
            <p>Provozovatel může Podmínky kdykoli aktualizovat. O změnách budou uživatelé informováni předem.</p>
            <p>Používáním Platformy uživatel souhlasí s aktuálním zněním Podmínek.</p>
          </section>
        </div>

        <div className="pt-4">
          <Link href="/" className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--mpc-accent)] hover:text-white">
            ← Zpět na homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
