"use client";

export type PlannerEvent = {
  id: string;
  title: string;
  timeLabel: string;
  top: number;
  height: number;
  muted?: boolean;
};

export type PlannerTask = {
  id: string;
  text: string;
  meta: string[];
  completed: boolean;
};

export type PlannerMonth = {
  id: string;
  tabLabel: string;
  weekLabel: string;
  seasonLabel: string;
  dayTitle: string;
  dateSubtitle: string;
  currentIndicatorTop: number;
  events: PlannerEvent[];
  tasks: PlannerTask[];
  notes: string;
};

export type PlannerContent = {
  months: Record<string, PlannerMonth>;
};

export const PLANNER_STORAGE_KEY = "tomas-pernik-planner-v1";
export const PLANNER_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May"] as const;

export const defaultPlannerContent: PlannerContent = {
  months: {
    Jan: {
      id: "Jan",
      tabLabel: "Jan",
      weekLabel: "Týden 03",
      seasonLabel: "Zimní agenda",
      dayTitle: "Úterý",
      dateSubtitle: "16. ledna 2026",
      currentIndicatorTop: 164,
      events: [
        { id: "jan-1", title: "Schůzka k bytové situaci ve Vimperku", timeLabel: "09:00 - 10:00", top: 48, height: 52 },
        { id: "jan-2", title: "Pracovní setkání k využití prázdných budov", timeLabel: "13:30 - 15:00", top: 286, height: 82 },
      ],
      tasks: [
        { id: "jan-t1", text: "Upřesnit priority k tématu dostupného bydlení.", meta: ["Kampaň"], completed: true },
        { id: "jan-t2", text: "Doplnit argumenty k odlivu mladých rodin z města.", meta: ["Obsah", "Do 15:00"], completed: false },
        { id: "jan-t3", text: "Připravit stručné body k rozhovoru pro lokální publikum.", meta: [], completed: false },
      ],
      notes: "Bydlení nesmí být abstraktní téma.\nJe potřeba mluvit jasně, konkrétně a srozumitelně pro místní rodiny.",
    },
    Feb: {
      id: "Feb",
      tabLabel: "Feb",
      weekLabel: "Týden 07",
      seasonLabel: "Setkání ve městě",
      dayTitle: "Středa",
      dateSubtitle: "14. února 2026",
      currentIndicatorTop: 222,
      events: [
        { id: "feb-1", title: "Ranní setkání s podnikateli z centra", timeLabel: "08:30 - 09:30", top: 28, height: 58 },
        { id: "feb-2", title: "Krátká pauza", timeLabel: "12:00 - 12:40", top: 194, height: 42, muted: true },
        { id: "feb-3", title: "Příprava komunikace k oživení náměstí", timeLabel: "15:00 - 16:30", top: 334, height: 84 },
      ],
      tasks: [
        { id: "feb-t1", text: "Doplnit příklady, jak vrátit život do centra.", meta: ["Obsah"], completed: false },
        { id: "feb-t2", text: "Potvrdit fotodokumentaci pro terénní výjezdy.", meta: ["Média"], completed: true },
        { id: "feb-t3", text: "Připravit přehled místních akcí a osobních setkání.", meta: [], completed: false },
      ],
      notes: "Centrum je silné téma, protože ho lidé zažívají denně.\nJe potřeba mluvit o řešeních, ne jen o nostalgii.",
    },
    Mar: {
      id: "Mar",
      tabLabel: "Mar",
      weekLabel: "Týden 12",
      seasonLabel: "Jarní kampaň",
      dayTitle: "Čtvrtek",
      dateSubtitle: "21. března 2026",
      currentIndicatorTop: 130,
      events: [
        { id: "mar-1", title: "Jednání k dopravě a průjezdnosti centra", timeLabel: "09:00 - 10:30", top: 48, height: 70 },
        { id: "mar-2", title: "Krátká pauza", timeLabel: "11:50 - 12:30", top: 194, height: 40, muted: true },
        { id: "mar-3", title: "Příprava argumentů k parkování a cyklotrasám", timeLabel: "14:30 - 16:00", top: 312, height: 90 },
      ],
      tasks: [
        { id: "mar-t1", text: "Zpřesnit stanovisko k dopravě, parkování a průjezdnosti.", meta: ["Doprava"], completed: true },
        { id: "mar-t2", text: "Převést strategický plán města do srozumitelných bodů pro veřejnost.", meta: ["Obsah", "Do 14:00"], completed: false },
        { id: "mar-t3", text: "Připravit stručný text k tomu, co má být ve městě vidět už letos.", meta: [], completed: false },
      ],
      notes: "Doprava je každodenní bolest, ne technický detail.\nKomunikace musí stát na tom, jak změny pocítí lidé v běžném dni.",
    },
    Apr: {
      id: "Apr",
      tabLabel: "Apr",
      weekLabel: "Týden 16",
      seasonLabel: "Jaro ve Vimperku",
      dayTitle: "Pondělí",
      dateSubtitle: "22. dubna 2026",
      currentIndicatorTop: 176,
      events: [
        { id: "apr-1", title: "Vyhodnocení dosavadní odezvy kampaně", timeLabel: "08:45 - 09:30", top: 30, height: 52 },
        { id: "apr-2", title: "Natáčení krátkých videí z města", timeLabel: "11:00 - 12:00", top: 144, height: 64 },
        { id: "apr-3", title: "Příprava večerního setkání s občany", timeLabel: "16:00 - 17:00", top: 388, height: 60 },
      ],
      tasks: [
        { id: "apr-t1", text: "Popsat, jak může Šumava přinést víc užitku i místním.", meta: ["Turismus"], completed: false },
        { id: "apr-t2", text: "Připravit vizuály a krátké výstupy pro online komunikaci.", meta: ["Kampaň"], completed: false },
        { id: "apr-t3", text: "Poslat briefing dobrovolníkům a podporovatelům.", meta: ["Tým"], completed: true },
      ],
      notes: "Šumava nesmí být jen kulisa na plakátu.\nJe potřeba ji přeložit do pracovních příležitostí, služeb a života ve městě.",
    },
    May: {
      id: "May",
      tabLabel: "May",
      weekLabel: "Týden 20",
      seasonLabel: "Komunitní kampaň",
      dayTitle: "Pátek",
      dateSubtitle: "17. května 2026",
      currentIndicatorTop: 250,
      events: [
        { id: "may-1", title: "Koordinační porada s podporovateli", timeLabel: "10:00 - 11:00", top: 96, height: 62 },
        { id: "may-2", title: "Krátká pauza", timeLabel: "12:30 - 13:10", top: 214, height: 42, muted: true },
        { id: "may-3", title: "Otevřená debata s obyvateli Vimperka", timeLabel: "15:30 - 17:00", top: 360, height: 86 },
      ],
      tasks: [
        { id: "may-t1", text: "Doplnit nejčastější otázky od lidí z terénu.", meta: ["Kontakt"], completed: false },
        { id: "may-t2", text: "Potvrdit organizaci lokální akce a zázemí.", meta: ["Terén"], completed: true },
        { id: "may-t3", text: "Připravit měsíční shrnutí a další krok kampaně.", meta: [], completed: false },
      ],
      notes: "Osobní kontakt zůstává klíčový kanál.\nWeb má lidi přivést blíž, ne nahradit setkání v reálném městě.",
    },
  },
};

export function cloneDefaultPlannerContent() {
  return JSON.parse(JSON.stringify(defaultPlannerContent)) as PlannerContent;
}

function normalizeContent(raw: unknown): PlannerContent {
  const fallback = cloneDefaultPlannerContent();

  if (!raw || typeof raw !== "object" || !("months" in raw)) {
    return fallback;
  }

  const candidate = raw as PlannerContent;

  for (const month of PLANNER_MONTHS) {
    const sourceMonth = candidate.months?.[month];
    if (!sourceMonth) {
      continue;
    }

    fallback.months[month] = {
      ...fallback.months[month],
      ...sourceMonth,
      events: Array.isArray(sourceMonth.events) ? sourceMonth.events : fallback.months[month].events,
      tasks: Array.isArray(sourceMonth.tasks) ? sourceMonth.tasks : fallback.months[month].tasks,
    };
  }

  return fallback;
}

export function loadPlannerContent() {
  if (typeof window === "undefined") {
    return cloneDefaultPlannerContent();
  }

  try {
    const raw = window.localStorage.getItem(PLANNER_STORAGE_KEY);
    if (!raw) {
      return cloneDefaultPlannerContent();
    }

    return normalizeContent(JSON.parse(raw));
  } catch {
    return cloneDefaultPlannerContent();
  }
}

export function savePlannerContent(content: PlannerContent) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(content));
}

export function resetPlannerContent() {
  const fallback = cloneDefaultPlannerContent();
  savePlannerContent(fallback);
  return fallback;
}
