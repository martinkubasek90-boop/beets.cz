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
      weekLabel: "Week 03",
      seasonLabel: "Winter Agenda",
      dayTitle: "Tuesday",
      dateSubtitle: "January 16th, 2024",
      currentIndicatorTop: 164,
      events: [
        { id: "jan-1", title: "Kickoff with local media partners", timeLabel: "09:00 - 10:00", top: 48, height: 52 },
        { id: "jan-2", title: "Policy workshop and notes review", timeLabel: "13:30 - 15:00", top: 286, height: 82 },
      ],
      tasks: [
        { id: "jan-t1", text: "Approve January communication plan.", meta: ["Campaign"], completed: true },
        { id: "jan-t2", text: "Update community event calendar.", meta: ["Operations", "Due 3:00 PM"], completed: false },
        { id: "jan-t3", text: "Prepare talking points for radio interview.", meta: [], completed: false },
      ],
      notes: "Check venue availability for the first town hall.\nFollow up with the design team on print drafts.",
    },
    Feb: {
      id: "Feb",
      tabLabel: "Feb",
      weekLabel: "Week 07",
      seasonLabel: "Regional Tour",
      dayTitle: "Wednesday",
      dateSubtitle: "February 14th, 2024",
      currentIndicatorTop: 222,
      events: [
        { id: "feb-1", title: "Constituency breakfast meetup", timeLabel: "08:30 - 09:30", top: 28, height: 58 },
        { id: "feb-2", title: "Lunch break", timeLabel: "12:00 - 12:40", top: 194, height: 42, muted: true },
        { id: "feb-3", title: "Planning session for regional ads", timeLabel: "15:00 - 16:30", top: 334, height: 84 },
      ],
      tasks: [
        { id: "feb-t1", text: "Finalize February newsletter content.", meta: ["Content"], completed: false },
        { id: "feb-t2", text: "Confirm photographer for weekend event.", meta: ["Media"], completed: true },
        { id: "feb-t3", text: "Review volunteer sign-up list.", meta: [], completed: false },
      ],
      notes: "Keep testimonial quotes short and direct.\nNeed one stronger photo for the hero section.",
    },
    Mar: {
      id: "Mar",
      tabLabel: "Mar",
      weekLabel: "Week 12",
      seasonLabel: "Spring Equinox",
      dayTitle: "Thursday",
      dateSubtitle: "March 21st, 2024",
      currentIndicatorTop: 130,
      events: [
        { id: "mar-1", title: "Botanical Sourcing & Vendor Calls", timeLabel: "09:00 - 10:30", top: 48, height: 70 },
        { id: "mar-2", title: "Lunch Break", timeLabel: "11:50 - 12:30", top: 194, height: 40, muted: true },
        { id: "mar-3", title: "Review Q2 Floral Arrangements Design Mockups", timeLabel: "14:30 - 16:00", top: 312, height: 90 },
      ],
      tasks: [
        { id: "mar-t1", text: "Finalize color palette for the 'Flower Friendly' landing page campaign.", meta: ["Design"], completed: true },
        { id: "mar-t2", text: "Update inventory counts for Peonies and Ranunculus arrivals.", meta: ["Operations", "Due 2:00 PM"], completed: false },
        { id: "mar-t3", text: "Draft copy for the bespoke wedding bouquet brochure.", meta: [], completed: false },
      ],
      notes: "Remember to ask Sarah about the new ceramic vases...\nThe matte finish works beautifully with the soft pinks.",
    },
    Apr: {
      id: "Apr",
      tabLabel: "Apr",
      weekLabel: "Week 16",
      seasonLabel: "Launch Window",
      dayTitle: "Monday",
      dateSubtitle: "April 22nd, 2024",
      currentIndicatorTop: 176,
      events: [
        { id: "apr-1", title: "Morning review of landing page metrics", timeLabel: "08:45 - 09:30", top: 30, height: 52 },
        { id: "apr-2", title: "Record outreach videos", timeLabel: "11:00 - 12:00", top: 144, height: 64 },
        { id: "apr-3", title: "Evening Q&A prep", timeLabel: "16:00 - 17:00", top: 388, height: 60 },
      ],
      tasks: [
        { id: "apr-t1", text: "Publish final April event recap.", meta: ["Social"], completed: false },
        { id: "apr-t2", text: "Lock banner variants for ad testing.", meta: ["Ads"], completed: false },
        { id: "apr-t3", text: "Share briefing with volunteer coordinators.", meta: ["Team"], completed: true },
      ],
      notes: "Need a shorter variant of the main CTA.\nKeep the page more direct and less ceremonial.",
    },
    May: {
      id: "May",
      tabLabel: "May",
      weekLabel: "Week 20",
      seasonLabel: "Community Week",
      dayTitle: "Friday",
      dateSubtitle: "May 17th, 2024",
      currentIndicatorTop: 250,
      events: [
        { id: "may-1", title: "Volunteer stand-up and checklist review", timeLabel: "10:00 - 11:00", top: 96, height: 62 },
        { id: "may-2", title: "Lunch Break", timeLabel: "12:30 - 13:10", top: 214, height: 42, muted: true },
        { id: "may-3", title: "Open discussion with residents", timeLabel: "15:30 - 17:00", top: 360, height: 86 },
      ],
      tasks: [
        { id: "may-t1", text: "Refresh FAQ answers from latest feedback.", meta: ["Support"], completed: false },
        { id: "may-t2", text: "Coordinate local venue setup.", meta: ["Field"], completed: true },
        { id: "may-t3", text: "Prepare month-end summary email.", meta: [], completed: false },
      ],
      notes: "The planner block should feel calm and precise.\nBlue-white treatment works better than the original rose palette here.",
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
