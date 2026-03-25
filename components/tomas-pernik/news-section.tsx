import styles from "@/app/tomas-pernik/tomas-pernik.module.css";
import { getTomasPernikNewsContent } from "@/lib/tomas-pernik-news";
import { NewsCarousel } from "@/components/tomas-pernik/news-carousel";
import { sortNewsItemsNewestFirst } from "@/components/tomas-pernik/news-content";

export async function NewsSection() {
  const content = await getTomasPernikNewsContent();
  const published = sortNewsItemsNewestFirst(
    content.items.filter((item) => item.status === "published"),
  );

  return (
    <section className={`${styles.section} ${styles.newsSection}`} id="novinky">
      <div className={styles.shell}>
        <div className={styles.sectionHead}>
          <span className={styles.kicker}>Novinky</span>
          <h2>Nejnovější vyjádření, komentáře a témata na jednom místě</h2>
        </div>

        {published.length === 0 ? (
          <div className={styles.newsEmpty}>
            Zatím tu nejsou publikované novinky. Import a schválení článků je v adminu
            na <a href="/tomas-pernik/admin/news">/tomas-pernik/admin/news</a>.
          </div>
        ) : (
          <NewsCarousel items={published} />
        )}
      </div>
    </section>
  );
}
