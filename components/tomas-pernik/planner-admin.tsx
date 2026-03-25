"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type PlannerContent,
  type PlannerEvent,
  type PlannerTask,
  PLANNER_MONTHS,
  cloneDefaultPlannerContent,
  loadPlannerContent,
  resetPlannerContent,
  savePlannerContent,
} from "@/components/tomas-pernik/planner-content";
import styles from "@/app/tomas-pernik/admin/admin.module.css";

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function PlannerAdmin() {
  const [content, setContent] = useState<PlannerContent>(() => cloneDefaultPlannerContent());
  const [activeMonth, setActiveMonth] = useState("Mar");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setContent(loadPlannerContent());
  }, []);

  const month = useMemo(() => content.months[activeMonth] ?? content.months.Mar, [activeMonth, content]);

  function patchMonth(patch: Partial<typeof month>) {
    setContent((current) => ({
      months: {
        ...current.months,
        [activeMonth]: {
          ...current.months[activeMonth],
          ...patch,
        },
      },
    }));
  }

  function patchEvent(id: string, patch: Partial<PlannerEvent>) {
    patchMonth({
      events: month.events.map((event) => (event.id === id ? { ...event, ...patch } : event)),
    });
  }

  function patchTask(id: string, patch: Partial<PlannerTask>) {
    patchMonth({
      tasks: month.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    });
  }

  function handleSave() {
    savePlannerContent(content);
    setSavedAt(new Date().toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }));
  }

  function handleReset() {
    const fallback = resetPlannerContent();
    setContent(fallback);
    setSavedAt(null);
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Admin</p>
            <h1>Tomáš Perník Planner</h1>
            <p className={styles.lead}>
              Tady upravujete obsah planner sekce pro veřejnou stránku
              <strong> /tomas-pernik</strong>. Změny se ukládají do `localStorage`, takže
              fungují okamžitě v tomto prohlížeči bez backendu.
            </p>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={handleReset}>
              Obnovit výchozí obsah
            </button>
            <button type="button" className={styles.primaryButton} onClick={handleSave}>
              Uložit změny
            </button>
          </div>
        </header>

        <div className={styles.monthTabs}>
          {PLANNER_MONTHS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`${styles.monthTab} ${activeMonth === tab ? styles.monthTabActive : ""}`}
              onClick={() => setActiveMonth(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className={styles.statusRow}>
          <span>Aktivní měsíc: {month.tabLabel}</span>
          <span>{savedAt ? `Uloženo v ${savedAt}` : "Změny ještě nejsou uložené."}</span>
        </div>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2>Záhlaví a kalendář</h2>

            <label className={styles.field}>
              <span>Week label</span>
              <input value={month.weekLabel} onChange={(e) => patchMonth({ weekLabel: e.target.value })} />
            </label>

            <label className={styles.field}>
              <span>Season label</span>
              <input value={month.seasonLabel} onChange={(e) => patchMonth({ seasonLabel: e.target.value })} />
            </label>

            <label className={styles.field}>
              <span>Day title</span>
              <input value={month.dayTitle} onChange={(e) => patchMonth({ dayTitle: e.target.value })} />
            </label>

            <label className={styles.field}>
              <span>Date subtitle</span>
              <input value={month.dateSubtitle} onChange={(e) => patchMonth({ dateSubtitle: e.target.value })} />
            </label>

            <label className={styles.field}>
              <span>Current indicator top</span>
              <input
                type="number"
                value={month.currentIndicatorTop}
                onChange={(e) => patchMonth({ currentIndicatorTop: Number(e.target.value) || 0 })}
              />
            </label>
          </article>

          <article className={styles.card}>
            <div className={styles.cardHead}>
              <h2>Události</h2>
              <button
                type="button"
                className={styles.smallButton}
                onClick={() =>
                  patchMonth({
                    events: [
                      ...month.events,
                      { id: createId("event"), title: "Nová událost", timeLabel: "09:00 - 10:00", top: 48, height: 60 },
                    ],
                  })
                }
              >
                Přidat událost
              </button>
            </div>

            <div className={styles.stack}>
              {month.events.map((event) => (
                <div key={event.id} className={styles.subcard}>
                  <label className={styles.field}>
                    <span>Název</span>
                    <input value={event.title} onChange={(e) => patchEvent(event.id, { title: e.target.value })} />
                  </label>
                  <label className={styles.field}>
                    <span>Čas</span>
                    <input value={event.timeLabel} onChange={(e) => patchEvent(event.id, { timeLabel: e.target.value })} />
                  </label>
                  <div className={styles.inlineFields}>
                    <label className={styles.field}>
                      <span>Top</span>
                      <input
                        type="number"
                        value={event.top}
                        onChange={(e) => patchEvent(event.id, { top: Number(e.target.value) || 0 })}
                      />
                    </label>
                    <label className={styles.field}>
                      <span>Výška</span>
                      <input
                        type="number"
                        value={event.height}
                        onChange={(e) => patchEvent(event.id, { height: Number(e.target.value) || 0 })}
                      />
                    </label>
                  </div>
                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={Boolean(event.muted)}
                      onChange={(e) => patchEvent(event.id, { muted: e.target.checked })}
                    />
                    <span>Muted styl</span>
                  </label>
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => patchMonth({ events: month.events.filter((item) => item.id !== event.id) })}
                  >
                    Smazat událost
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardHead}>
              <h2>Priority</h2>
              <button
                type="button"
                className={styles.smallButton}
                onClick={() =>
                  patchMonth({
                    tasks: [...month.tasks, { id: createId("task"), text: "Nový úkol", meta: [], completed: false }],
                  })
                }
              >
                Přidat úkol
              </button>
            </div>

            <div className={styles.stack}>
              {month.tasks.map((task) => (
                <div key={task.id} className={styles.subcard}>
                  <label className={styles.field}>
                    <span>Text úkolu</span>
                    <textarea value={task.text} onChange={(e) => patchTask(task.id, { text: e.target.value })} rows={3} />
                  </label>
                  <label className={styles.field}>
                    <span>Meta hodnoty</span>
                    <input
                      value={task.meta.join(" | ")}
                      onChange={(e) =>
                        patchTask(task.id, {
                          meta: e.target.value
                            .split("|")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </label>
                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={(e) => patchTask(task.id, { completed: e.target.checked })}
                    />
                    <span>Splněno</span>
                  </label>
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => patchMonth({ tasks: month.tasks.filter((item) => item.id !== task.id) })}
                  >
                    Smazat úkol
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.card}>
            <h2>Poznámky</h2>
            <label className={styles.field}>
              <span>Journal &amp; Notes</span>
              <textarea value={month.notes} onChange={(e) => patchMonth({ notes: e.target.value })} rows={8} />
            </label>
          </article>
        </section>
      </div>
    </main>
  );
}
