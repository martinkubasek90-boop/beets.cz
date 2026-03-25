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

export const PLANNER_STORAGE_KEY = "tomas-pernik-planner-v2";
export const PLANNER_MONTHS = ["2024", "2025", "2026", "2027", "2028"] as const;

export const defaultPlannerContent: PlannerContent = {
  months: {
    "2024": {
      id: "2024",
      tabLabel: "2024",
      weekLabel: "Rok 2024",
      seasonLabel: "Příprava kandidatury",
      dayTitle: "2024",
      dateSubtitle: "leden až prosinec",
      currentIndicatorTop: 94,
      events: [
        { id: "2024-1", title: "Sběr podnětů z Vimperka a mapování hlavních problémů", timeLabel: "LEDEN - BŘEZEN", top: 18, height: 88 },
        { id: "2024-2", title: "První konkrétní návrhy k bydlení a centru města", timeLabel: "KVĚTEN - ČERVENEC", top: 214, height: 88 },
        { id: "2024-3", title: "Ujasnění hlavní linky kampaně a lokálních témat", timeLabel: "ZÁŘÍ - LISTOPAD", top: 410, height: 88 },
      ],
      tasks: [
        { id: "2024-t1", text: "Sjednotit, která témata lidé řeší nejčastěji v běžném životě.", meta: ["Terén"], completed: true },
        { id: "2024-t2", text: "Převést lokální zkušenosti do srozumitelného programu.", meta: ["Program", "Jaro"], completed: false },
        { id: "2024-t3", text: "Postavit komunikaci na důvěře, ne na negaci.", meta: [], completed: false },
      ],
      notes: "Rok přípravy má ukázat, že kandidatura nestojí na marketingové konstrukci.\nZáklad musí být ve znalosti města a v tématech, která lidé řeší každý měsíc.",
    },
    "2025": {
      id: "2025",
      tabLabel: "2025",
      weekLabel: "Rok 2025",
      seasonLabel: "Budování podpory",
      dayTitle: "2025",
      dateSubtitle: "leden až prosinec",
      currentIndicatorTop: 190,
      events: [
        { id: "2025-1", title: "Setkávání s podnikateli, rodinami a lidmi z centra", timeLabel: "ÚNOR - DUBEN", top: 116, height: 88 },
        { id: "2025-2", title: "Příprava veřejných výstupů k dopravě a bydlení", timeLabel: "ČERVEN - SRPEN", top: 312, height: 88 },
        { id: "2025-3", title: "Rozšíření online komunikace a lokální viditelnosti", timeLabel: "ŘÍJEN - PROSINEC", top: 508, height: 88 },
      ],
      tasks: [
        { id: "2025-t1", text: "Zesílit kontakt s lidmi, kteří ve městě zvažují, jestli zůstat.", meta: ["Komunita"], completed: false },
        { id: "2025-t2", text: "Připravit jednoduché argumenty k centru, parkování a dostupnosti služeb.", meta: ["Obsah"], completed: true },
        { id: "2025-t3", text: "Ladit vizuální a obsahový styl kampaně bez zbytečné obecnosti.", meta: [], completed: false },
      ],
      notes: "Rok 2025 je o tom, aby Tomáš Perník nebyl jen jméno na plakátu.\nMusí být jasné, co chce ve Vimperku změnit a proč to souvisí s každodenním životem lidí.",
    },
    "2026": {
      id: "2026",
      tabLabel: "2026",
      weekLabel: "Rok 2026",
      seasonLabel: "Komunální volby",
      dayTitle: "2026",
      dateSubtitle: "leden až prosinec",
      currentIndicatorTop: 286,
      events: [
        { id: "2026-1", title: "Viditelně otevřít témata dopravy, centra a bydlení", timeLabel: "LEDEN - BŘEZEN", top: 214, height: 88 },
        { id: "2026-2", title: "Přetavit program do srozumitelných výstupů pro veřejnost", timeLabel: "KVĚTEN - ČERVENEC", top: 410, height: 88 },
        { id: "2026-3", title: "Finální terénní i online kampaň před komunálními volbami", timeLabel: "ZÁŘÍ - LISTOPAD", top: 606, height: 88 },
      ],
      tasks: [
        { id: "2026-t1", text: "Zpřesnit stanovisko k dopravě, parkování a průjezdnosti.", meta: ["Doprava"], completed: true },
        { id: "2026-t2", text: "Převést strategický plán města do konkrétních bodů pro obyvatele.", meta: ["Program", "Léto"], completed: false },
        { id: "2026-t3", text: "Připravit silné finální sdělení, proč má smysl dát Vimperku novou energii.", meta: [], completed: false },
      ],
      notes: "Rok voleb musí stát na konkrétnosti. Nestačí mluvit o rozvoji obecně.\nKaždé sdělení má odpovídat na to, co bude v běžném životě lidí ve Vimperku jiné a lepší.",
    },
    "2027": {
      id: "2027",
      tabLabel: "2027",
      weekLabel: "Rok 2027",
      seasonLabel: "První rok po volbách",
      dayTitle: "2027",
      dateSubtitle: "leden až prosinec",
      currentIndicatorTop: 382,
      events: [
        { id: "2027-1", title: "Ukázat první výsledky a viditelné kroky pro město", timeLabel: "ÚNOR - DUBEN", top: 312, height: 88 },
        { id: "2027-2", title: "Držet vysokou frekvenci komunikace s občany", timeLabel: "ČERVEN - SRPEN", top: 508, height: 88 },
        { id: "2027-3", title: "Zpracovat zpětnou vazbu a upravit priority další práce", timeLabel: "ŘÍJEN - PROSINEC", top: 704, height: 88 },
      ],
      tasks: [
        { id: "2027-t1", text: "Ukázat, že politika může přinášet měřitelné drobné změny hned od začátku.", meta: ["Výsledky"], completed: false },
        { id: "2027-t2", text: "Udržet důvěru průběžným vysvětlováním kroků a rozhodnutí.", meta: ["Komunikace"], completed: false },
        { id: "2027-t3", text: "Sbírat témata, která je potřeba otevřít v další etapě práce.", meta: [], completed: true },
      ],
      notes: "Po volbách nesmí web usnout. Má ukazovat, že slova pokračují v práci.\nLidé musí vidět, co se posouvá, co se připravuje a co vyžaduje delší čas.",
    },
    "2028": {
      id: "2028",
      tabLabel: "2028",
      weekLabel: "Rok 2028",
      seasonLabel: "Dlouhodobé priority",
      dayTitle: "2028",
      dateSubtitle: "leden až prosinec",
      currentIndicatorTop: 478,
      events: [
        { id: "2028-1", title: "Vyhodnotit, co se podařilo opravdu změnit v praxi", timeLabel: "LEDEN - BŘEZEN", top: 410, height: 88 },
        { id: "2028-2", title: "Posunout další projekty k bydlení, centru a kvalitě života", timeLabel: "KVĚTEN - SRPEN", top: 606, height: 102 },
        { id: "2028-3", title: "Připravit další dlouhodobou vizi rozvoje Vimperka", timeLabel: "ŘÍJEN - PROSINEC", top: 802, height: 88 },
      ],
      tasks: [
        { id: "2028-t1", text: "Měřit dopad na každodenní život lidí, ne jen počet splněných bodů.", meta: ["Vyhodnocení"], completed: false },
        { id: "2028-t2", text: "Připravit další srozumitelnou vizi pro budoucnost města.", meta: ["Strategie"], completed: false },
        { id: "2028-t3", text: "Udržet politiku blízko lidem i mimo volební období.", meta: [], completed: true },
      ],
      notes: "Dlouhodobý plán má být čitelný i bez politického slovníku.\nSmysl má jen tehdy, když lidé poznají, že město funguje lépe měsíc po měsíci.",
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
    if (!sourceMonth) continue;

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
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(content));
}

export function resetPlannerContent() {
  const fallback = cloneDefaultPlannerContent();
  savePlannerContent(fallback);
  return fallback;
}
