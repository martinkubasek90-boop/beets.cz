import type { Metadata } from "next";
import { NewsAdmin } from "@/components/tomas-pernik/news-admin";

export const metadata: Metadata = {
  title: "Tomáš Perník News Admin",
  description: "Import a schvalování novinek z ODS pro stránku Tomáš Perník.",
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

export default function TomasPernikNewsAdminPage() {
  return <NewsAdmin />;
}
