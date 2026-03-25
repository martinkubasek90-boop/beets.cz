"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "@/app/tomas-pernik/tomas-pernik.module.css";
import {
  type PlannerContent,
  PLANNER_MONTHS,
  cloneDefaultPlannerContent,
  loadPlannerContent,
} from "@/components/tomas-pernik/planner-content";

const timeBlocks = [
  "Leden",
  "Únor",
  "Březen",
  "Duben",
  "Květen",
  "Červen",
  "Červenec",
  "Srpen",
  "Září",
  "Říjen",
  "Listopad",
  "Prosinec",
];

export function PlannerShowcase() {
  const [activeTab, setActiveTab] = useState("2026");
  const [content, setContent] = useState<PlannerContent>(() => cloneDefaultPlannerContent());

  useEffect(() => {
    setContent(loadPlannerContent());
  }, []);

  const month = useMemo(() => content.months[activeTab] ?? content.months["2026"], [activeTab, content]);

  return (
    <section className={styles.plannerSection} id="planner">
      <div className={styles.shell}>
        <div className={styles.sectionHead}>
          <span className={styles.kicker}>Na čem aktuálně pracuje</span>
          <h2>Přehled priorit, termínů a témat, která mají být vidět hned po úvodu</h2>
        </div>

        <div className={styles.plannerHost}>
          <div className={styles.deskSurface}>
            <div className={styles.plannerTabs}>
              {PLANNER_MONTHS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`${styles.plannerTab} ${activeTab === tab ? styles.plannerTabActive : ""}`}
                  onClick={() => setActiveTab(tab)}
                  aria-pressed={activeTab === tab}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className={styles.plannerBook}>
              <div className={`${styles.plannerPage} ${styles.plannerPageLeft}`}>
                <header className={styles.dateHeader}>
                  <div className={styles.metaTop}>
                    <span>{month.weekLabel}</span>
                    <div className={styles.metaLine} />
                    <span>{month.seasonLabel}</span>
                  </div>
                  <h3 className={styles.dayTitle}>{month.dayTitle}</h3>
                  <div className={styles.dateSubtitle}>{month.dateSubtitle}</div>
                </header>

                <div className={styles.scheduleContainer}>
                  <div className={styles.currentTimeIndicator} style={{ top: month.currentIndicatorTop }} />

                  {timeBlocks.map((time) => (
                    <div key={time} className={styles.timeBlock}>
                      <div className={styles.timeLabel}>{time}</div>
                      <div className={styles.timeLine} />
                    </div>
                  ))}

                  {month.events.map((event) => (
                    <div
                      key={event.id}
                      className={event.muted ? styles.eventMuted : styles.eventPrimary}
                      style={{ top: event.top, height: event.height }}
                    >
                      <span className={event.muted ? styles.eventTimeMuted : styles.eventTime}>
                        {event.timeLabel}
                      </span>
                      {event.title}
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.spine} aria-hidden="true">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className={styles.ringGroup}>
                    <div className={`${styles.hole} ${styles.holeLeft}`} />
                    <div className={styles.ring} />
                    <div className={`${styles.hole} ${styles.holeRight}`} />
                  </div>
                ))}
              </div>

              <div className={`${styles.plannerPage} ${styles.plannerPageRight}`}>
                <div className={styles.cornerDeco} aria-hidden="true">
                  <div className={styles.cornerDot} />
                  <div className={`${styles.cornerDot} ${styles.cornerDotFaint}`} />
                </div>

                <h3 className={styles.sectionTitle}>Priority</h3>

                <ul className={styles.taskList}>
                  {month.tasks.map((task) => (
                    <li
                      key={task.id}
                      className={`${styles.taskItem} ${task.completed ? styles.taskItemCompleted : ""}`}
                    >
                      <div className={styles.taskCheckbox} aria-hidden="true" />
                      <div className={styles.taskContent}>
                        <div className={styles.taskText}>{task.text}</div>
                        {task.meta.length > 0 ? (
                          <div className={styles.taskMeta}>
                            {task.meta.map((item) => (
                              <span key={item} className={item.includes("Due") ? undefined : styles.tag}>
                                {item}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>

                <h3 className={styles.sectionTitle}>Poznámky</h3>

                <div className={styles.notesArea}>
                  <svg
                    className={styles.watermark}
                    viewBox="0 0 100 100"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path fill="currentColor" d="M50 100 C 40 80, 20 60, 20 40 C 20 20, 40 10, 50 10 C 60 10, 80 20, 80 40 C 80 60, 60 80, 50 100 Z" />
                    <path fill="currentColor" d="M50 90 C 45 70, 30 50, 30 35 C 30 20, 45 15, 50 15 C 55 15, 70 20, 70 35 C 70 50, 55 70, 50 90 Z" opacity="0.5" />
                    <circle cx="50" cy="30" r="5" fill="currentColor" />
                  </svg>

                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className={styles.ruledLine} />
                  ))}

                  <div className={styles.handwriting}>
                    {month.notes}
                  </div>
                </div>

                <div className={styles.pageCurlTarget} />
                <div className={styles.pageCurl} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
