import type { Metadata } from "next";
import { PlannerAdmin } from "@/components/tomas-pernik/planner-admin";

export const metadata: Metadata = {
  title: "Tomáš Perník Planner Admin",
  description: "Lokální admin pro editaci planner sekce na stránce Tomáš Perník.",
};

export default function TomasPernikAdminPage() {
  return <PlannerAdmin />;
}
