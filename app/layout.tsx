import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { GlobalPlayerProvider } from "@/components/global-player-provider";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "BEETS.CZ",
  description:
    "Platforma pro beatmakery a spolupráce. Nahrávej beaty, akapely a domlouvej spolupráce přímo na jednom místě.",
  icons: {
    icon: "/favicon.svg",
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <GlobalPlayerProvider>
            <div className="relative min-h-screen pb-24">
              {children}
            </div>
          </GlobalPlayerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
