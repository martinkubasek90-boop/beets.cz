"use client";

import { useState } from "react";
import styles from "@/app/tomas-pernik/tomas-pernik.module.css";

const tabs = ["Jan", "Feb", "Mar", "Apr", "May"];

const tasks = [
  {
    text: "Finalize color palette for the 'Flower Friendly' landing page campaign.",
    meta: ["Design"],
    completed: true,
  },
  {
    text: "Update inventory counts for Peonies and Ranunculus arrivals.",
    meta: ["Operations", "Due 2:00 PM"],
    completed: false,
  },
  {
    text: "Draft copy for the bespoke wedding bouquet brochure.",
    meta: [],
    completed: false,
  },
];

const timeBlocks = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

export function PlannerShowcase() {
  const [activeTab, setActiveTab] = useState("Mar");
  const [taskState, setTaskState] = useState(tasks);

  return (
    <section className={styles.plannerSection} id="planner">
      <div className={styles.shell}>
        <div className={styles.sectionHead}>
          <span className={styles.kicker}>Designový element</span>
          <h2>Bespoke planner blok vložený přímo do landing page</h2>
        </div>

        <div className={styles.plannerHost}>
          <div className={styles.deskSurface}>
            <div className={styles.plannerTabs}>
              {tabs.map((tab) => (
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
                    <span>Week 12</span>
                    <div className={styles.metaLine} />
                    <span>Spring Equinox</span>
                  </div>
                  <h3 className={styles.dayTitle}>Thursday</h3>
                  <div className={styles.dateSubtitle}>March 21st, 2024</div>
                </header>

                <div className={styles.scheduleContainer}>
                  <div className={styles.currentTimeIndicator} />

                  {timeBlocks.map((time) => (
                    <div key={time} className={styles.timeBlock}>
                      <div className={styles.timeLabel}>{time}</div>
                      <div className={styles.timeLine} />
                    </div>
                  ))}

                  <div className={styles.eventPrimary} style={{ top: 48, height: 70 }}>
                    <span className={styles.eventTime}>09:00 - 10:30</span>
                    Botanical Sourcing &amp; Vendor Calls
                  </div>

                  <div className={styles.eventMuted} style={{ top: 194, height: 40 }}>
                    <span className={styles.eventTimeMuted}>11:50 - 12:30</span>
                    Lunch Break
                  </div>

                  <div className={styles.eventPrimary} style={{ top: 312, height: 90 }}>
                    <span className={styles.eventTime}>14:30 - 16:00</span>
                    Review Q2 Floral Arrangements Design Mockups
                  </div>
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

                <h3 className={styles.sectionTitle}>Priorities</h3>

                <ul className={styles.taskList}>
                  {taskState.map((task, index) => (
                    <li
                      key={task.text}
                      className={`${styles.taskItem} ${task.completed ? styles.taskItemCompleted : ""}`}
                    >
                      <button
                        type="button"
                        className={styles.taskCheckbox}
                        onClick={() =>
                          setTaskState((current) =>
                            current.map((entry, entryIndex) =>
                              entryIndex === index
                                ? { ...entry, completed: !entry.completed }
                                : entry,
                            ),
                          )
                        }
                        aria-label={`Toggle task ${index + 1}`}
                      />
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

                <h3 className={styles.sectionTitle}>Journal &amp; Notes</h3>

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
                    Remember to ask Sarah about the new ceramic vases...
                    <br />
                    The matte finish works beautifully with the soft pinks.
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
