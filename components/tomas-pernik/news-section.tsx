import styles from "@/app/tomas-pernik/tomas-pernik.module.css";
import { getTomasPernikNewsContent } from "@/lib/tomas-pernik-news";

export async function NewsSection() {
  const content = await getTomasPernikNewsContent();
  const published = content.items.filter((item) => item.status === "published");

  return (
    <section className={`${styles.section} ${styles.newsSection}`} id="novinky">
      <div className={styles.shell}>
        <div className={styles.sectionHead}>
          <span className={styles.kicker}>Novinky</span>
          <h2>Schválené články z ODS přepsané pro tuto landing page</h2>
        </div>

        {published.length === 0 ? (
          <div className={styles.newsEmpty}>
            Zatím tu nejsou publikované novinky. Import a schválení článků je v adminu
            na <a href="/tomas-pernik/admin/news">/tomas-pernik/admin/news</a>.
          </div>
        ) : (
          <div className={styles.newsGrid}>
            {published.map((item) => (
              <article key={item.id} className={styles.newsCard}>
                <p className={styles.newsMeta}>{item.sourceDate}</p>
                <h3>{item.rewrittenTitle || item.sourceTitle}</h3>
                <p>{item.rewrittenExcerpt || item.sourceExcerpt}</p>
                <a className={styles.newsLink} href={item.sourceUrl} target="_blank" rel="noreferrer">
                  Otevřít zdroj na ODS
                </a>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
