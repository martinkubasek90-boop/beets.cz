import type { Metadata } from "next";
import Link from "next/link";
import { Lora, Raleway } from "next/font/google";
import { ArrowRight, Mail, MapPin, Users } from "lucide-react";
import { NewsSection } from "@/components/tomas-pernik/news-section";
import { PlannerShowcase } from "@/components/tomas-pernik/planner-showcase";
import { RetrofuturisticBackground } from "@/components/tomas-pernik/retrofuturistic-background";
import VideoPlayer from "@/components/tomas-pernik/video-player";
import styles from "./tomas-pernik.module.css";

const lora = Lora({
  subsets: ["latin"],
  variable: "--tp-font-serif",
  weight: ["400", "500"],
});

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--tp-font-sans",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Tomáš Perník | Vimperk potřebuje energii, která zůstává doma",
  description:
    "Osobní web Tomáše Perníka pro komunální volby 2026 ve Vimperku. Priority, agenda, novinky i prostor pro přímý kontakt.",
};

export const dynamic = "force-dynamic";

const portraitUrl = "/tomas-pernik/pernik-portrait-cutout.png";
const campaignVideoUrl = "https://www.youtube.com/watch?v=6dl1X7ujk1c";

const priorities = [
  {
    title: "Bydlení pro mladé Vimperáky",
    text: "Podpora dostupného bydlení, práce s brownfieldy a využití prázdných budov tak, aby mladí lidé nemuseli hledat budoucnost jinde.",
  },
  {
    title: "Živé centrum města",
    text: "Lepší podmínky pro malé podnikatele, služby a podnikání v centru, které má znovu fungovat jako přirozené srdce Vimperka.",
  },
  {
    title: "Doprava, která neotravuje den",
    text: "Parkování, průjezdnost a bezpečný pohyb po městě nesmí zůstávat jen tématem strategií, ale musí se proměnit v konkrétní kroky.",
  },
  {
    title: "Šumava jako příležitost",
    text: "Vimperk má využít svou polohu i partnerství tak, aby z turismu a investic netěžila jen mapa, ale i místní lidé a podnikání.",
  },
];

export default function TomasPernikPage() {
  return (
    <main className={`${styles.page} ${lora.variable} ${raleway.variable}`}>
      <section className={styles.hero}>
        <div className={styles.heroCanvas} aria-hidden="true">
          <RetrofuturisticBackground />
        </div>

        <div className={styles.heroGlow} aria-hidden="true" />

        <div className={styles.shell}>
          <header className={styles.topbar}>
            <Link href="/" className={styles.brand}>
              <img
                src="https://www.ods.cz/img/logo/ods-logo-plna-barva.jpg"
                alt="Logo ODS"
                className={styles.brandLogo}
              />
              <span className={styles.brandText}>Tomáš Perník</span>
            </Link>
            <nav className={styles.nav}>
              <a href="#planner">Agenda</a>
              <a href="#profil">Profil</a>
              <a href="#priority">Priority</a>
              <a href="#novinky">Novinky</a>
              <a href="#kontakt">Kontakt</a>
            </nav>
          </header>

          <div className={styles.heroLayout}>
            <div className={styles.heroCopy}>
              <span className={styles.kicker}>Komunální volby 2026 | Vimperk</span>
              <h1 className={styles.heroTitle}>
                <span className={styles.heroTitleFirst}>Tomáš</span>{" "}
                <span className={styles.heroTitleLast}>
                  Pe<span className={styles.heroRnFix}>rn</span>
                  <span className={styles.heroAccentFix}>í</span>k
                </span>
              </h1>
              <p className={styles.lead}>
                Vimperák, který chce, aby mladí ve městě zůstali, centrum znovu žilo a
                rozvoj Vimperka nestál jen na plánech na papíře. Pozitivně, konkrétně a
                s respektem k tomu, co už se ve městě podařilo.
              </p>
              <div className={styles.actions}>
                <a className={styles.primaryButton} href="#kontakt">
                  Napsat a spojit se
                  <ArrowRight size={16} />
                </a>
                <a className={styles.secondaryButton} href="#planner">
                  Zobrazit aktuální agendu
                </a>
              </div>
              <ul className={styles.inlineFacts}>
                <li>
                  <Users size={16} />
                  Kandidát ODS pro komunální volby 2026
                </li>
                <li>
                  <MapPin size={16} />
                  Vimperk a lokální témata v první linii
                </li>
                <li>
                  <Mail size={16} />
                  Novinky, agenda a kontakt na jednom místě
                </li>
                <li>
                  <ArrowRight size={16} />
                  Facebook a Instagram pro průběžnou komunikaci
                </li>
              </ul>
            </div>

            <aside className={styles.heroVisual}>
              <div className={styles.heroPortrait}>
                <img className={styles.heroPortraitImage} src={portraitUrl} alt="Tomáš Perník" />
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <span className={styles.kicker}>Video</span>
            <h2>Krátké kampaňové video připravené pro mobil i desktop</h2>
          </div>
          <VideoPlayer src={campaignVideoUrl} poster={portraitUrl} title="Tomáš Perník | Kampaňové video" />
        </div>
      </section>

      <PlannerShowcase />

      <section id="profil" className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.shell}>
          <div className={styles.profileLayout}>
            <div className={styles.profileCard}>
              <h2>Vimperk má dobrý základ. Teď potřebuje energii, která dotáhne důležité věci do výsledku.</h2>
              <p>
                Tahle kampaň nestojí na tom, že je všechno špatně. Naopak: Vimperk je město
                s potenciálem i konkrétním zlepšením v kvalitě života. O to důležitější je
                řešit to, co lidé cítí denně: odchod mladých, bydlení, prázdnější centrum
                i dopravní omezení, která komplikují běžný den.
              </p>
            </div>

            <div className={styles.statPanel}>
              <p className={styles.cardLabel}>Vimperk v číslech</p>
              <div className={styles.statItem}>
                <strong>7 464</strong>
                <span>obyvatel města k 1. 1. 2025</span>
              </div>
              <div className={styles.statItem}>
                <strong>43 let</strong>
                <span>průměrný věk v širším krajském kontextu ukazuje, proč je důležité udržet mladé rodiny ve městě</span>
              </div>
              <div className={styles.statItem}>
                <strong>900+</strong>
                <span>pracovních míst u největšího zaměstnavatele Rohde &amp; Schwarz potvrzuje, že Vimperk má na čem stavět</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="priority" className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <h2>Čtyři témata, která mohou ve Vimperku rozhodnout důvěru i výsledek kampaně</h2>
          </div>
          <div className={styles.priorityGrid}>
            {priorities.map((item) => (
              <article key={item.title} className={styles.priorityCard}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <NewsSection />

      <section id="kontakt" className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.ctaCard}>
            <div>
              <h2>Máte podnět pro Vimperk, otázku nebo chuť pomoci? Ozvěte se napřímo.</h2>
              <p>
                Kampaň stojí i na tom, že se politika vrací do normálního rozhovoru s lidmi.
                Napište, co je podle vás potřeba ve Vimperku posunout, co funguje a co by mělo dostat větší prioritu.
              </p>
            </div>
            <a className={styles.primaryButton} href="https://www.facebook.com/perniktom" target="_blank" rel="noreferrer">
              Facebook Tomáše Perníka
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
