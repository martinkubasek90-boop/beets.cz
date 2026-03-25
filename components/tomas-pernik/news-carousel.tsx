"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import styles from "@/app/tomas-pernik/tomas-pernik.module.css";
import { type ImportedNewsItem } from "@/components/tomas-pernik/news-content";

type NewsCarouselProps = {
  items: ImportedNewsItem[];
};

const PAGE_SIZE = 3;

export function NewsCarousel({ items }: NewsCarouselProps) {
  const [page, setPage] = useState(0);

  const pages = useMemo(() => {
    const chunks: ImportedNewsItem[][] = [];

    for (let index = 0; index < items.length; index += PAGE_SIZE) {
      chunks.push(items.slice(index, index + PAGE_SIZE));
    }

    return chunks;
  }, [items]);

  const safePage = Math.min(page, Math.max(pages.length - 1, 0));
  const visible = pages[safePage] ?? [];

  return (
    <div className={styles.newsCarousel}>
      <div className={styles.newsGrid}>
        {visible.map((item) => (
          <article key={item.id} className={styles.newsCard}>
            {item.imageUrl ? (
              <div className={styles.newsCardImageWrap}>
                <img
                  className={styles.newsCardImage}
                  src={item.imageUrl}
                  alt={item.rewrittenTitle || item.sourceTitle}
                />
              </div>
            ) : null}
            <p className={styles.newsMeta}>{item.sourceDate}</p>
            <h3>{item.rewrittenTitle || item.sourceTitle}</h3>
            <p>{item.rewrittenExcerpt || item.sourceExcerpt || "Aktuální vyjádření a komentář k tématu dne."}</p>
            <a className={styles.newsLink} href={item.sourceUrl} target="_blank" rel="noreferrer">
              Přečíst celý článek
            </a>
          </article>
        ))}
      </div>

      {pages.length > 1 ? (
        <div className={styles.newsSliderControls}>
          <button
            type="button"
            className={styles.newsSliderButton}
            onClick={() => setPage((current) => Math.max(current - 1, 0))}
            disabled={safePage === 0}
          >
            <ArrowLeft size={16} />
            Novější
          </button>
          <div className={styles.newsSliderMeta}>
            <span>
              Zobrazeny články {safePage * PAGE_SIZE + 1}-{Math.min((safePage + 1) * PAGE_SIZE, items.length)} z {items.length}
            </span>
            <div className={styles.newsSliderDots}>
              {pages.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  className={`${styles.newsSliderDot} ${index === safePage ? styles.newsSliderDotActive : ""}`}
                  onClick={() => setPage(index)}
                  aria-label={`Zobrazit stránku ${index + 1}`}
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            className={styles.newsSliderButton}
            onClick={() => setPage((current) => Math.min(current + 1, pages.length - 1))}
            disabled={safePage === pages.length - 1}
          >
            Starší
            <ArrowRight size={16} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
