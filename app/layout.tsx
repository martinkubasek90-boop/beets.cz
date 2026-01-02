import type { Metadata } from "next";
import localFont from "next/font/local";
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

const brandFont = localFont({
  src: "../public/fonts/Jaoren.ttf",
  variable: "--font-brand",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${brandFont.className} antialiased`}>
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
