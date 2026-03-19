import type { Metadata } from "next";
import { LinkedInDashboard } from "@/components/linkedin/linkedin-dashboard";
import { getLinkedInDashboardData } from "@/lib/linkedin-scraper";

export const metadata: Metadata = {
  title: "LinkedIn Leads | BEETS.CZ",
  description: "MVP dashboard pro discovery a scraping verejnych LinkedIn profilu.",
};

export default async function LinkedInPage() {
  const initialData = await getLinkedInDashboardData();
  return <LinkedInDashboard initialData={initialData} />;
}
