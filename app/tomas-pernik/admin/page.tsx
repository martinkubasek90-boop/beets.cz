import type { Metadata } from "next";
import { PlannerAdmin } from "@/components/tomas-pernik/planner-admin";

export const metadata: Metadata = {
  title: "Tomáš Perník Planner Admin",
  description: "Lokální admin pro editaci planner sekce na stránce Tomáš Perník.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      noarchive: true,
      nosnippet: true,
    },
  },
};

export default function TomasPernikAdminPage() {
  return <PlannerAdmin />;
}
