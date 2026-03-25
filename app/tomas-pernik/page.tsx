import type { Metadata } from "next";
import Link from "next/link";
import { Lora, Raleway } from "next/font/google";
import { ArrowRight, ChevronRight, Mail, MapPin, Users } from "lucide-react";
import { NewsSection } from "@/components/tomas-pernik/news-section";
import { PlannerShowcase } from "@/components/tomas-pernik/planner-showcase";
import { RetrofuturisticBackground } from "@/components/tomas-pernik/retrofuturistic-background";
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
  title: "Tomáš Perník | Profilová landing page",
  description:
    "Profilová landing page pro Tomáše Perníka v light brandingu ODS s vlastním retrofuturistickým 3D pozadím.",
};

export const dynamic = "force-dynamic";

const priorities = [
  {
    title: "Dostupná komunikace",
    text: "Jasně strukturovaný obsah, přehledné kontaktní body a jednoduché CTA pro dotazy i zapojení.",
  },
  {
    title: "Moderní vizuál",
    text: "Vlastní 3D scéna navazuje na referenční styl, ale drží se čistého modrobílého brandingu.",
  },
  {
    title: "Důvěryhodná prezentace",
    text: "Landing page je připravená jako silný osobní profil bez vizuálního chaosu a bez závislosti na Spline.",
  },
];

const pillars = [
  "Osobní profil a stručné představení",
  "Sekce s prioritami a tématy",
  "Prostor pro aktuality, program nebo reference",
  "Výzva ke kontaktu a zapojení",
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
              <a href="#priority">Priority</a>
              <a href="#profil">Profil</a>
              <a href="/tomas-pernik/admin">Admin</a>
              <a href="#novinky">Novinky</a>
              <a href="#kontakt">Kontakt</a>
            </nav>
          </header>

          <div className={styles.heroLayout}>
            <div className={styles.heroCopy}>
              <span className={styles.kicker}>Profilová landing page</span>
              <h1>Tomáš Perník</h1>
              <p className={styles.lead}>
                Návrh samostatné stránky pro URL <strong>beets.cz/tomas-pernik</strong>.
                Vizuál drží zadaný ODS branding, ale používá vlastní WebGL scénu místo
                externího Spline embedu.
              </p>
              <div className={styles.actions}>
                <a className={styles.primaryButton} href="#kontakt">
                  Kontaktovat tým
                  <ArrowRight size={16} />
                </a>
                <a className={styles.secondaryButton} href="#profil">
                  Zobrazit strukturu
                </a>
              </div>
              <ul className={styles.inlineFacts}>
                <li>
                  <Users size={16} />
                  připraveno pro osobní profil
                </li>
                <li>
                  <MapPin size={16} />
                  vhodné pro lokální i krajskou komunikaci
                </li>
                <li>
                  <Mail size={16} />
                  snadno doplnitelné o formulář a novinky
                </li>
              </ul>
            </div>

            <aside className={styles.heroCard}>
              <p className={styles.cardLabel}>Aktuální stav</p>
              <h2>Hotový designový základ pro nasazení</h2>
              <p>
                Tahle verze je záměrně postavená jako čistý prototyp. Struktura, CTA a
                vizuální hierarchie jsou připravené, finální texty a fakta o kandidátovi
                se dají doplnit bez zásahu do layoutu.
              </p>
              <ul className={styles.cardList}>
                {pillars.map((item) => (
                  <li key={item}>
                    <ChevronRight size={16} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <section id="priority" className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <span className={styles.kicker}>Co je na stránce připravené</span>
            <h2>Retrofuturistická estetika převedená do čistého politického brandingu</h2>
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

      <section id="profil" className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.shell}>
          <div className={styles.profileLayout}>
            <div className={styles.profileCard}>
              <span className={styles.kicker}>Doplnitelný obsah</span>
              <h2>Místo pro finální bio, priority a lokální témata</h2>
              <p>
                Tahle část je připravená pro ostrý obsah. Můžete sem doplnit krátký
                medailon, konkrétní priority, reference, výsledky práce nebo lokální
                témata podle města či regionu.
              </p>
            </div>

            <div className={styles.statPanel}>
              <p className={styles.cardLabel}>Doporučená skladba</p>
              <div className={styles.statItem}>
                <strong>01</strong>
                <span>Silný hero s osobním positioningem</span>
              </div>
              <div className={styles.statItem}>
                <strong>02</strong>
                <span>Krátký profil a 3 až 4 nosná témata</span>
              </div>
              <div className={styles.statItem}>
                <strong>03</strong>
                <span>Jasný kontakt nebo formulář pro zájemce</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PlannerShowcase />
      <NewsSection />

      <section id="kontakt" className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.ctaCard}>
            <div>
              <span className={styles.kicker}>Další krok</span>
              <h2>Pošlete finální texty a kontakty, nasazení už je připravené</h2>
              <p>
                Pokud chcete, navážu rovnou druhým krokem: doplnění reálného obsahu,
                fotky kandidáta, kontaktního formuláře a případně novinkové sekce.
              </p>
            </div>
            <a className={styles.primaryButton} href="mailto:info@beets.cz">
              info@beets.cz
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
