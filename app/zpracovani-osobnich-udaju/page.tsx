'use client';

import Link from 'next/link';
import { MainNav } from '@/components/main-nav';

export default function ZpracovaniOsobnichUdajuPage() {
  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#050505)] text-white">
      <MainNav />
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted,#8a8a8a)]">
            Zásady zpracování osobních údajů (GDPR)
          </p>
          <h1 className="text-3xl font-bold uppercase tracking-[0.12em]">Beets.cz</h1>
          <p className="text-sm text-[var(--mpc-muted,#8a8a8a)]">Jak zpracováváme osobní údaje uživatelů v souladu s GDPR.</p>
        </header>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-[var(--mpc-light,#e5e7eb)] shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">1. Úvod</h2>
            <p>
              Tyto Zásady zpracování osobních údajů (“Zásady”) popisují, jak platforma Beets.cz (“Platforma”, “Provozovatel”) zpracovává
              osobní údaje uživatelů v souladu s Nařízením EU č. 2016/679 (“GDPR”). Používáním Platformy potvrzuje uživatel, že se se
              Zásadami seznámil.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">2. Správce osobních údajů</h2>
            <p>Správcem osobních údajů je:</p>
            <p>
              Martin Kubásek
              <br />
              Mírová 429
              <br />
              Vimperk
              <br />
              38501
              <br />
              E-mail: martin.kubasek@icloud.com
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">3. Jaké osobní údaje zpracováváme</h2>
            <p>V rámci používání Platformy zpracováváme zejména:</p>
            <ul className="list-disc space-y-1 pl-5 text-[var(--mpc-muted,#9ca3af)]">
              <li>
                <strong>Údaje poskytnuté při registraci:</strong> jméno/přezdívka, e-mailová adresa, profilová fotografie (pokud ji uživatel
                nahraje), heslo (v šifrované podobě).
              </li>
              <li>
                <strong>Údaje v profilu uživatele:</strong> popisy, texty, bio, audio nahrávky a informace o dílech, umělecké informace
                dobrovolně vyplněné uživatelem.
              </li>
              <li>
                <strong>Technické údaje:</strong> IP adresa, cookies a identifikátory zařízení, informace o přihlášení a bezpečnostní logy.
              </li>
              <li>
                <strong>Komunikace mezi uživateli:</strong> textové zprávy, chat, informace o volání (čas, délka, účastníci). Obsah hovorů
                neuchováváme.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">4. Účely zpracování osobních údajů</h2>
            <p>Osobní údaje zpracováváme za účely:</p>
            <ul className="list-disc space-y-1 pl-5 text-[var(--mpc-muted,#9ca3af)]">
              <li>
                <strong>Provozování uživatelských účtů:</strong> registrace, přihlášení, správa profilu.
              </li>
              <li>
                <strong>Zobrazení profilu a obsahu:</strong> audio nahrávky, fotografie, popisy, vizualizace na platformě.
              </li>
              <li>
                <strong>Zajištění komunikace mezi uživateli:</strong> zasílání zpráv, připojení ke callům pomocí externích služeb (např.
                Jitsi).
              </li>
              <li>
                <strong>Bezpečnost a ochrana služby:</strong> logy, IP adresy, prevence zneužití.
              </li>
              <li>
                <strong>Splnění zákonných povinností:</strong> účetní doklady (pokud vzniknou platby), plnění GDPR.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">5. Právní základy zpracování</h2>
            <p>Zpracování provádíme na základě:</p>
            <ul className="list-disc space-y-1 pl-5 text-[var(--mpc-muted,#9ca3af)]">
              <li>
                <strong>Plnění smlouvy (čl. 6 odst. 1 písm. b GDPR):</strong> používání účtu, profilů a funkcí platformy.
              </li>
              <li>
                <strong>Oprávněného zájmu (čl. 6 odst. 1 písm. f):</strong> ochrana platformy, prevence zneužití, statistiky a technická
                analýza provozu.
              </li>
              <li>
                <strong>Souhlasu uživatele (čl. 6 odst. 1 písm. a):</strong> newslettery, marketing, cookies mimo nezbytné.
              </li>
              <li>
                <strong>Plnění právní povinnosti (čl. 6 odst. 1 písm. c):</strong> daně, účetnictví (pokud bude placený obsah).
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">6. Uchovávání osobních údajů</h2>
            <p>Osobní údaje uchováváme:</p>
            <ul className="list-disc space-y-1 pl-5 text-[var(--mpc-muted,#9ca3af)]">
              <li>po dobu aktivního používání účtu,</li>
              <li>do 30 dnů od žádosti o smazání účtu,</li>
              <li>logy a technická data max. 12 měsíců,</li>
              <li>účetní doklady dle zákona (pokud existují) po dobu 10 let.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">7. Sdílení osobních údajů</h2>
            <p>Osobní údaje nesdílíme s třetími stranami, kromě:</p>
            <ul className="list-disc space-y-1 pl-5 text-[var(--mpc-muted,#9ca3af)]">
              <li>
                <strong>Poskytovatelů služeb (zpracovatelů):</strong> Supabase (autentizace, databáze), Vercel (hosting), Jitsi/Meet.jit.si
                (pouze při připojení k hovoru), IT služby a bezpečnostní systémy.
              </li>
              <li>
                <strong>Orgánů veřejné moci:</strong> pouze pokud nám to ukládá zákon.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">8. Přenos dat mimo EU</h2>
            <p>
              Supabase i Vercel mohou ukládat data na serverech v EU i mimo EU. V těchto případech je zajištěn přenos dat na základě
              Standardních smluvních doložek (SCC) a dodatků o zpracování dat (DPA).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">9. Práva uživatelů</h2>
            <p>
              Uživatel má právo na přístup, opravu, výmaz (právo být zapomenut), omezení zpracování, přenositelnost, vznést námitku proti
              zpracování a odvolat souhlas kdykoli. Žádosti je možné posílat na e-mail: martin.kubasek@icloud.com.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">10. Cookies</h2>
            <p>
              Platforma může používat nezbytné cookies (login, bezpečnost) a analytické cookies (na základě souhlasu). Uživatel může správu
              cookies kdykoli změnit v nastavení prohlížeče.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">11. Zabezpečení dat</h2>
            <p>
              Provozovatel používá šifrování hesel (bcrypt nebo jiný hash), HTTPS spojení, přístupová oprávnění do databáze a monitorování
              pokusů o zneužití.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-white">12. Kontakt</h2>
            <p>Veškeré dotazy a žádosti lze posílat na: martin.kubasek@icloud.com.</p>
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
