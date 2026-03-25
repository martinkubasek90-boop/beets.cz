"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type ImportedNewsItem,
  type NewsContent,
  cloneDefaultNewsContent,
} from "@/components/tomas-pernik/news-content";
import styles from "@/app/tomas-pernik/admin/admin.module.css";

type OdsItem = {
  title: string;
  link: string;
  date: string;
  excerpt: string;
  imageUrl: string;
};

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function NewsAdmin() {
  const [content, setContent] = useState<NewsContent>(() => cloneDefaultNewsContent());
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [rewritingId, setRewritingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadContent();
  }, []);

  const drafts = useMemo(() => content.items.filter((item) => item.status === "draft"), [content]);
  const published = useMemo(() => content.items.filter((item) => item.status === "published"), [content]);

  function patchItem(id: string, patch: Partial<ImportedNewsItem>) {
    setContent((current) => ({
      items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }

  async function loadContent() {
    try {
      const response = await fetch("/api/tomas-pernik/news-content", { cache: "no-store" });
      const payload = (await response.json()) as { content?: NewsContent; error?: string };
      if (!response.ok || !payload.content) {
        throw new Error(payload.error || "Načtení novinek selhalo.");
      }
      setContent(payload.content);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Načtení novinek selhalo.");
    }
  }

  async function persist(next: NewsContent, successMessage?: string) {
    setSaving(true);
    try {
      const response = await fetch("/api/tomas-pernik/news-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: next }),
      });
      const payload = (await response.json()) as { content?: NewsContent; error?: string };
      if (!response.ok || !payload.content) {
        throw new Error(payload.error || "Uložení novinek selhalo.");
      }
      setContent(payload.content);
      setStatus(successMessage || "Novinky uloženy.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Uložení novinek selhalo.");
    } finally {
      setSaving(false);
    }
  }

  async function importFromOds() {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/tomas-pernik/ods-news", { cache: "no-store" });
      const payload = (await response.json()) as { items?: OdsItem[]; error?: string };
      if (!response.ok || !payload.items) {
        throw new Error(payload.error || "Import z ODS selhal.");
      }

      const existingByUrl = new Map(content.items.map((item) => [item.sourceUrl, item]));
      const merged: ImportedNewsItem[] = [...content.items];

      for (const source of payload.items) {
        if (existingByUrl.has(source.link)) continue;
        merged.unshift({
          id: createId("news"),
          sourceUrl: source.link,
          sourceTitle: source.title,
          sourceDate: source.date,
          sourceExcerpt: source.excerpt,
          imageUrl: source.imageUrl,
          rewrittenTitle: source.title,
          rewrittenExcerpt: source.excerpt,
          rewrittenBody: source.excerpt,
          status: "draft",
        });
      }

      await persist({ items: merged }, `Import hotový. Načteno ${payload.items.length} položek.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Import selhal.");
    } finally {
      setLoading(false);
    }
  }

  async function rewriteItem(item: ImportedNewsItem) {
    setRewritingId(item.id);
    setStatus("");
    try {
      const response = await fetch("/api/tomas-pernik/rewrite-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.sourceTitle,
          excerpt: item.sourceExcerpt,
          url: item.sourceUrl,
        }),
      });

      const payload = (await response.json()) as {
        title?: string;
        excerpt?: string;
        body?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "AI přepis selhal.");
      }

      const next = {
        items: content.items.map((row) =>
          row.id === item.id
            ? {
                ...row,
                rewrittenTitle: payload.title || item.rewrittenTitle,
                rewrittenExcerpt: payload.excerpt || item.rewrittenExcerpt,
                rewrittenBody: payload.body || item.rewrittenBody,
              }
            : row,
        ),
      };
      await persist(next, `Článek „${item.sourceTitle}“ byl přepsán.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "AI přepis selhal.");
    } finally {
      setRewritingId(null);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Admin</p>
            <h1>Tomáš Perník News Admin</h1>
            <p className={styles.lead}>
              Import novinek z ODS, AI přepis do požadovaného stylu a publikace na
              veřejnou stránku <strong>/tomas-pernik</strong>. Tohle už se ukládá
              centrálně do Supabase, ne jen do localStorage.
            </p>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.smallButton} onClick={() => void loadContent()}>
              Obnovit data
            </button>
            <button type="button" className={styles.secondaryButton} onClick={importFromOds} disabled={loading}>
              {loading ? "Načítám..." : "Načíst z ODS"}
            </button>
          </div>
        </header>

        {status ? <div className={styles.statusRow}><span>{status}</span></div> : null}

        <section className={styles.grid}>
          <article className={styles.card}>
            <div className={styles.cardHead}>
              <h2>Drafts</h2>
              <span>{drafts.length}</span>
            </div>
            <div className={styles.stack}>
              {drafts.map((item) => (
                <div key={item.id} className={styles.subcard}>
                  {item.imageUrl ? (
                    <img className={styles.previewImage} src={item.imageUrl} alt={item.sourceTitle} />
                  ) : null}
                  <label className={styles.field}>
                    <span>Zdrojový titulek</span>
                    <input value={item.sourceTitle} readOnly />
                  </label>
                  <label className={styles.field}>
                    <span>URL obrázku</span>
                    <input
                      value={item.imageUrl}
                      onChange={(e) => patchItem(item.id, { imageUrl: e.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Přepsaný titulek</span>
                    <input
                      value={item.rewrittenTitle}
                      onChange={(e) => patchItem(item.id, { rewrittenTitle: e.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Perex</span>
                    <textarea
                      rows={4}
                      value={item.rewrittenExcerpt}
                      onChange={(e) => patchItem(item.id, { rewrittenExcerpt: e.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Tělo článku</span>
                    <textarea
                      rows={6}
                      value={item.rewrittenBody}
                      onChange={(e) => patchItem(item.id, { rewrittenBody: e.target.value })}
                    />
                  </label>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.smallButton}
                      onClick={() => void rewriteItem(item)}
                      disabled={rewritingId === item.id}
                    >
                      {rewritingId === item.id ? "Přepisuju..." : "AI přepis"}
                    </button>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() =>
                        void persist(
                          { items: content.items.map((row) => row.id === item.id ? { ...row, status: "published" } : row) },
                          "Článek publikován.",
                        )
                      }
                      disabled={saving}
                    >
                      Publikovat
                    </button>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => void persist({ items: content.items.filter((row) => row.id !== item.id) }, "Článek smazán.")}
                      disabled={saving}
                    >
                      Smazat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardHead}>
              <h2>Publikované</h2>
              <span>{published.length}</span>
            </div>
            <div className={styles.stack}>
              {published.map((item) => (
                <div key={item.id} className={styles.subcard}>
                  {item.imageUrl ? (
                    <img className={styles.previewImage} src={item.imageUrl} alt={item.rewrittenTitle} />
                  ) : null}
                  <strong>{item.rewrittenTitle}</strong>
                  <p>{item.rewrittenExcerpt}</p>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() =>
                        void persist(
                          { items: content.items.map((row) => row.id === item.id ? { ...row, status: "draft" } : row) },
                          "Článek vrácen do draftu.",
                        )
                      }
                      disabled={saving}
                    >
                      Vrátit do draftu
                    </button>
                    <a className={styles.smallButton} href={item.sourceUrl} target="_blank" rel="noreferrer">
                      Zdroj ODS
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
