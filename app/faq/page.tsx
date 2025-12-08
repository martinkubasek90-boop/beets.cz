import Link from "next/link";

const faqs = [
  {
    title: "Účet a přihlášení",
    items: [
      {
        q: "Jak si založím účet?",
        a: "Na stránce Registrace vyplň e-mail a heslo. Po odeslání potvrď účet kliknutím na odkaz v potvrzovacím e-mailu.",
      },
      {
        q: "E-mail nepřišel, co s tím?",
        a: "Zkontroluj spam, případně si v přihlášení zkus vyžádat nové ověření. Pokud používáš vlastní SMTP, ověř správnost přihlašovacích údajů v Supabase.",
      },
      {
        q: "Můžu se přihlásit přes Google?",
        a: "Ano, pokud je na projektu povolen OAuth Google v Supabase. Vyber Google při přihlášení a dokonči ověření účtu.",
      },
      {
        q: "Zapomněl jsem heslo.",
        a: "Na přihlašovací stránce klikni na „Zapomněli jste heslo?“, zadej e-mail a postupuj podle instrukcí v e-mailu pro reset.",
      },
    ],
  },
  {
    title: "Nahrávání beatů",
    items: [
      {
        q: "Jak nahrát beat?",
        a: "V profilu klikni na „Nahrát beat“. Vyplň název, BPM, mood/vibe a nahraj audio (WAV/MP3). Nepovinně můžeš přidat cover nebo externí URL (SoundCloud/YouTube).",
      },
      {
        q: "Jaké formáty a limity podporujete?",
        a: "Podporujeme WAV a MP3. Pro rychlejší upload drž velikost při zemi; extrémně velké soubory mohou být zamítnuty poskytovatelem úložiště.",
      },
      {
        q: "Kde se beat zobrazí?",
        a: "Po uložení se zobrazí v sekci Beats a může se použít v přehrávači (včetně spodní lišty).",
      },
    ],
  },
  {
    title: "Nahrávání projektů",
    items: [
      {
        q: "Jak vytvořit projekt/EP?",
        a: "V profilu zvol „Nahrát projekt“, vyplň název a popis, nahraj cover a přidej jednotlivé tracky (audio + název).",
      },
      {
        q: "Jak fungují režimy přístupu (public / na žádost / private)?",
        a: "Public: kdokoli může přehrát. Na žádost: přehrání povolené až po schválení žádosti. Private: jen schválení uživatelé mají přístup.",
      },
      {
        q: "Jak někdo požádá o přístup k projektu?",
        a: "U projektů v režimu „na žádost“ mají přihlášení uživatelé tlačítko „Požádat o přístup“. Autoři žádost vidí a mohou ji schválit/odmítnout.",
      },
      {
        q: "Proč se tracky neukazují?",
        a: "Zkontroluj, že audio bylo opravdu nahrané (nejen název) a že projekt není zamčený bez uděleného přístupu. U zamčených projektů musí mít uživatel schválený grant.",
      },
    ],
  },
  {
    title: "Spolupráce a zprávy",
    items: [
      {
        q: "Jak požádat o spolupráci z veřejného profilu?",
        a: "Na veřejném profilu klikni na „Požádat o spolupráci“. Vyplň krátkou zprávu, případně přilož soubor. Po odeslání se založí vlákno spolupráce.",
      },
      {
        q: "Kolik vláken spolupráce mohu mít s jedním uživatelem?",
        a: "Aktuálně je vynuceno jedno vlákno mezi dvěma uživateli. Nové zprávy a soubory přidávej do existujícího vlákna.",
      },
      {
        q: "Jak fungují soukromé zprávy?",
        a: "V profilu je sekce Zprávy. Vyhledej příjemce podle jména profilu, napiš zprávu a odešli. V konverzacích se zobrazuje jméno profilu, ne e-mail.",
      },
      {
        q: "Dostanu upozornění na nové zprávy?",
        a: "Ano, na profilu je zvoneček s notifikacemi. Notifikace se generují při nových zprávách, spolupracích a žádostech o přístup.",
      },
    ],
  },
  {
    title: "Oheň (reakce)",
    items: [
      {
        q: "Co jsou ohně?",
        a: "Místo liků můžeš přidat „oheň“ k beatům/projektům. Výška plamene ukazuje počet přidaných ohňů.",
      },
      {
        q: "Kolik ohňů mohu dát?",
        a: "Každý uživatel má týdenní limit (např. 10 ohňů/týden). Po vyčerpání musíš počkat do dalšího týdne.",
      },
    ],
  },
  {
    title: "Časté potíže",
    items: [
      {
        q: "Nejde přehrát audio",
        a: "Ověř, že jsi přihlášen a máš přístup (u zamčených projektů). Zkus refresh a přepni případně na jinou síť; přehrávač používá podepsané URL, které expirují.",
      },
      {
        q: "Build/Next.js chyby s fontem",
        a: "Při lokálním buildu bez internetu může selhat stahování fontu Geist. Na Vercelu s internetem build projde.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold uppercase tracking-[0.18em]">FAQ</h1>
              <p className="text-[13px] text-[var(--mpc-muted)]">
                Nejčastější dotazy k účtu, nahrávání beatů/projektů, spolupráci a zprávám.
              </p>
            </div>
            <div className="w-full md:w-auto">
              <div className="flex justify-end">
                <Link
                  href="/"
                  className="inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-white hover:border-[var(--mpc-accent)]"
                >
                  Zpět na homepage
                </Link>
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          {faqs.map((section) => (
            <section
              key={section.title}
              className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)]/60 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
            >
              <h2 className="text-xl font-semibold text-[var(--mpc-light)]">{section.title}</h2>
              <div className="mt-4 space-y-4">
                {section.items.map((item) => (
                  <div key={item.q} className="rounded-lg border border-white/5 bg-black/30 p-4">
                    <p className="text-[14px] font-semibold text-white">{item.q}</p>
                    <p className="mt-1 text-[13px] text-[var(--mpc-muted)] whitespace-pre-line">{item.a}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
