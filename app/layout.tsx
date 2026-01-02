import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { ThemeProvider } from "next-themes";
import { GlobalPlayerProvider } from "@/components/global-player-provider";
import { PasswordGate } from "@/components/password-gate";
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
  src: "../public/fonts/luthgy.ttf",
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
      <head>
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-QMMWPC151G"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-QMMWPC151G');
          `}
        </Script>
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "uqkkyhys14");
          `}
        </Script>
      </head>
      <body className={`${brandFont.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <GlobalPlayerProvider>
            <div className="relative min-h-screen pb-24">
              <PasswordGate>{children}</PasswordGate>
            </div>
          </GlobalPlayerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
