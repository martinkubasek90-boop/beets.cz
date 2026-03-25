import type { Metadata } from "next";
import styles from "./gate.module.css";

export const metadata: Metadata = {
  title: "Tomáš Perník | Přístup chráněn",
  description: "Heslová brána pro stránky Tomáše Perníka.",
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

type GatePageProps = {
  searchParams?: { next?: string };
};

export default function TomasPernikGatePage({ searchParams }: GatePageProps) {
  const next = searchParams?.next || "/tomas-pernik";

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.card}>
          <p className={styles.kicker}>Tomáš Perník</p>
          <h1>Přístup chráněn heslem</h1>
          <p className={styles.copy}>
            Tyto stránky jsou dostupné jen po zadání hesla. Pokud ho nemáte, ozvěte se prosím
            správci webu.
          </p>

          <form method="POST" action="/api/tomas-pernik/gate" className={styles.form}>
            <input type="hidden" name="next" value={next} />
            <label htmlFor="gate-pass">Heslo</label>
            <input id="gate-pass" name="password" type="password" autoComplete="current-password" />
            <button type="submit">Odemknout</button>
          </form>
        </div>
      </div>
    </main>
  );
}
