import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Manrope } from "next/font/google";
import {
  ArrowRight,
  BellRing,
  Bot,
  MapPinned,
  Newspaper,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import styles from "./vimperak.module.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--vim-font-display",
  weight: ["500", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--vim-font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "MůjVimperk | Digitální aplikace pro město, služby i komunitu",
  description:
    "Světlá produktová landing page pro aplikaci MůjVimperk. Živý zpravodaj, AI asistent, hlášení závad, adresář služeb a komunitní funkce na jednom místě.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      noarchive: true,
      nosnippet: true,
    },
  },
};

const mainFeatures = [
  {
    icon: Newspaper,
    title: "Živý zpravodaj pro každodenní přehled",
    text: "Jedno místo pro místní zprávy, kulturní program, důležité změny ve městě i přehled akcí, které mají obyvatelé skutečně vidět.",
  },
  {
    icon: Bot,
    title: "AI asistent dostupný 24 hodin denně",
    text: "Pomáhá s orientací ve službách města, odpovídá na časté dotazy, naviguje ke správným kontaktům a zjednodušuje běžné situace bez čekání.",
  },
  {
    icon: MapPinned,
    title: "Hlášení závad a pocitová mapa",
    text: "Občané mohou jednoduše nahlásit problém, přidat fotku a označit místo, které je potřeba řešit nebo které si zaslouží větší pozornost.",
  },
  {
    icon: Users,
    title: "Komunita, podnikatelé a sousedská výměna",
    text: "Komunitní nástěnka, místní nabídky, dobrovolnictví i akce ve městě. Aplikace má spojovat lidi, ne jen zobrazovat oznámení.",
  },
];

const supportingPoints = [
  "Jedna aplikace pro zpravodaj, služby, komunitu i AI podporu",
  "Lokální design a tón odpovídající Vimperku, ne generická municipalita",
  "MVP, které jde představit zastupitelům, partnerům i grantovým programům",
];

const productPillars = [
  {
    label: "Pro obyvatele",
    title: "Rychlý přístup k tomu, co je ve městě důležité právě dnes",
    text: "Dopravní změny, akce, úřední kontakty, poruchy, doporučené služby i lokální informace v jedné aplikaci bez hledání na více webech.",
  },
  {
    label: "Pro město",
    title: "Lepší digitální komunikace bez chaosu a roztříštěnosti",
    text: "Město získá centrální komunikační vrstvu, do které lze přidávat novinky, notifikace, participaci i digitální služby s měřitelným dopadem.",
  },
  {
    label: "Pro komunitu",
    title: "Místo, kde se potkává občanský podnět, podnikání a každodenní život",
    text: "Aplikace podporuje sousedství, místní podnikatele i aktivní lidi, kteří chtějí Vimperk zlepšovat a současně mít lepší přehled o dění.",
  },
];

const appModules = [
  {
    title: "Dashboard pro běžný den",
    body: "Ranní přehled, počasí, důležité aktuality, rychlé akce a notifikace na jednom startovním místě.",
    image: "/vimperak/dashboard.png",
    alt: "Domovská obrazovka aplikace MůjVimperk",
  },
  {
    title: "AI Vimperák",
    body: "Chatové rozhraní pro dotazy na služby města, formuláře, úřady, kontakty a lokální orientaci bez složité navigace.",
    image: "/vimperak/ai-asistent.png",
    alt: "Obrazovka AI asistenta Vimperák",
  },
  {
    title: "Hlášení závad a participace",
    body: "Přehledné nahlášení problému, přidání fotky a mapová logika, která podporuje skutečné zapojení obyvatel.",
    image: "/vimperak/hlaseni-zavad.png",
    alt: "Obrazovka hlášení závad a participace",
  },
  {
    title: "Adresář služeb a místních míst",
    body: "Restaurace, lékaři, taxíky, jízdní řády, letáky i praktické kontakty ve formátu, který je srozumitelný a rychlý.",
    image: "/vimperak/adresar-sluzeb.png",
    alt: "Obrazovka adresáře služeb ve Vimperku",
  },
  {
    title: "Komunita a akce",
    body: "Zprávy, události, městský život a sousedská výměna v mobilním formátu, který je přirozený i pro mladší publikum.",
    image: "/vimperak/komunita-a-akce.png",
    alt: "Obrazovka zpráv, komunity a akcí",
  },
];

export default function VimperakPage() {
  return (
    <main className={`${styles.page} ${manrope.variable} ${inter.variable}`}>
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.shell}>
          <header className={styles.topbar}>
            <Link href="/" className={styles.brand}>
              <span className={styles.brandBadge}>MůjVimperk</span>
              <span className={styles.brandMeta}>Digitální aplikace pro město a komunitu</span>
            </Link>
            <nav className={styles.nav}>
              <a href="#funkce">Funkce</a>
              <a href="#screeny">Screeny</a>
              <a href="#ai">AI</a>
              <a href="#mesto">Pro město</a>
              <a href="#kontakt">Kontakt</a>
            </nav>
          </header>

          <div className={styles.heroLayout}>
            <div className={styles.heroCopy}>
              <span className={styles.kicker}>Propojme Vimperk digitálně</span>
              <h1>Mobilní aplikace, která spojí městské informace, AI asistenta i komunitu do jednoho místa.</h1>
              <p className={styles.lead}>
                MůjVimperk je moderní digitální platforma pro zpravodaj, služby,
                participaci a každodenní orientaci ve městě. V jednom produktu
                spojuje to, co dnes obyvatelé hledají na několika různých místech.
              </p>

              <div className={styles.heroActions}>
                <a href="#screeny" className={styles.primaryButton}>
                  Prohlédnout aplikaci
                  <ArrowRight size={18} />
                </a>
                <a href="#kontakt" className={styles.secondaryButton}>
                  Chci prezentaci projektu
                </a>
              </div>

              <ul className={styles.heroBullets}>
                {supportingPoints.map((point) => (
                  <li key={point}>
                    <Sparkles size={16} />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.heroVisual}>
              <div className={styles.heroPhones}>
                <article className={styles.phoneCardPrimary}>
                  <img src="/vimperak/dashboard.png" alt="Dashboard aplikace MůjVimperk" />
                </article>
                <article className={styles.phoneCardSecondary}>
                  <img src="/vimperak/ai-asistent.png" alt="AI asistent v aplikaci MůjVimperk" />
                </article>
              </div>
              <div className={styles.floatingCard}>
                <span>AI asistent 24/7</span>
                <strong>odpovědi, kontakty, notifikace a lokální orientace bez čekání</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.metrics}>
        <div className={styles.shell}>
          <div className={styles.metricGrid}>
            <article>
              <strong>1 aplikace</strong>
              <span>pro zpravodaj, služby, participaci a AI pomoc</span>
            </article>
            <article>
              <strong>24/7</strong>
              <span>dostupnost AI asistenta pro dotazy občanů</span>
            </article>
            <article>
              <strong>~8 000</strong>
              <span>obyvatel Vimperku a okolí jako hlavní publikum MVP</span>
            </article>
            <article>
              <strong>MVP ready</strong>
              <span>pro jednání s městem, zastupiteli i grantovými programy</span>
            </article>
          </div>
        </div>
      </section>

      <section id="funkce" className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <span className={styles.kicker}>Klíčové moduly</span>
            <h2>Jedno místo pro všechny informace o Vimperku, ne další roztříštěný projekt vedle.</h2>
            <p>
              Produkt je navržený tak, aby byl srozumitelný pro běžné obyvatele,
              použitelný pro město a současně dost moderní pro mladší publikum, které
              dnes čeká kvalitní mobilní zážitek.
            </p>
          </div>

          <div className={styles.featureGrid}>
            {mainFeatures.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className={styles.featureCard}>
                  <div className={styles.featureIcon}>
                    <Icon size={20} />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="screeny" className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <span className={styles.kicker}>Produkt v obraze</span>
            <h2>Screeny aplikace ukazují, že MůjVimperk není obecná idea, ale konkrétní mobilní produkt.</h2>
            <p>
              Níže je návrh klíčových obrazovek pro domov, AI asistenta, hlášení závad,
              adresář služeb a komunitní část. Layout je postavený pro světlé prostředí,
              silnou čitelnost a moderní městský brand.
            </p>
          </div>

          <div className={styles.showcaseGrid}>
            {appModules.map((module, index) => (
              <article
                key={module.title}
                className={index === 0 ? styles.showcaseCardWide : styles.showcaseCard}
              >
                <div className={styles.showcaseCopy}>
                  <span>{module.title}</span>
                  <p>{module.body}</p>
                </div>
                <div className={styles.showcaseFrame}>
                  <img src={module.image} alt={module.alt} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="ai" className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.aiLayout}>
            <div className={styles.aiCopy}>
              <span className={styles.kicker}>AI vrstva</span>
              <h2>AI asistent má řešit každodenní otázky, ne být jen efektní funkce do prezentace.</h2>
              <p>
                Chatbot 24/7 může občanům poradit s úřady, službami města, formuláři,
                kontakty i orientací v běžných situacích. Vedle toho umí personalizovat obsah,
                doporučovat akce a pracovat s push notifikacemi podle relevance.
              </p>

              <div className={styles.aiChecklist}>
                <div>
                  <Bot size={18} />
                  <span>Odpovědi na dotazy o úřadech, službách a kontaktech</span>
                </div>
                <div>
                  <BellRing size={18} />
                  <span>Push upozornění na poruchy, uzavírky a důležité zprávy</span>
                </div>
                <div>
                  <ShieldCheck size={18} />
                  <span>Srozumitelný onboarding i pro publikum, které není technicky silné</span>
                </div>
              </div>
            </div>

            <div className={styles.aiPanel}>
              <div className={styles.aiPanelHeader}>
                <span>Co může AI řešit hned v MVP</span>
              </div>
              <ul>
                <li>Kam se obrátit při konkrétním problému</li>
                <li>Jak vyplnit základní formuláře a kde je najít</li>
                <li>Které akce nebo zprávy jsou relevantní pro konkrétního uživatele</li>
                <li>Kde nahlásit závadu nebo dohledat praktickou službu ve městě</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="mesto" className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <span className={styles.kicker}>Strategický rámec</span>
            <h2>MůjVimperk není jen aplikace pro obyvatele. Je to digitální vrstva pro lepší městskou komunikaci.</h2>
          </div>

          <div className={styles.pillarGrid}>
            {productPillars.map((pillar) => (
              <article key={pillar.title} className={styles.pillarCard}>
                <span>{pillar.label}</span>
                <h3>{pillar.title}</h3>
                <p>{pillar.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="kontakt" className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.ctaCard}>
            <span className={styles.kicker}>Další krok</span>
            <h2>Představit projekt zastupitelům města, získat podporu pro MVP a začít Vimperk spojovat digitálně.</h2>
            <p>
              Pokud dává smysl posunout MůjVimperk dál, další fáze je jasná: připravit
              detail MVP, ukázat produktové přínosy městu a otevřít cestu k financování
              a pilotnímu nasazení.
            </p>
            <div className={styles.ctaActions}>
              <a className={styles.primaryButton} href="mailto:info@tomaspernik.cz">
                Chci prezentaci projektu
                <ArrowRight size={18} />
              </a>
              <a className={styles.secondaryButton} href="https://tomaspernik.cz" target="_blank" rel="noreferrer">
                Zpět na hlavní web Tomáše Perníka
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
