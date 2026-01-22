import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
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
    icon: [
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
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
        <Script id="base44-chatbot" strategy="afterInteractive">
          {`
            (function() {
              var allowedUrls = ["*"];
              var excludedUrls = [];

              function toRegex(pattern) {
                var escaped = pattern.replace(/[.+^${}()|[\\]\\\\]/g, '\\\\$&');
                var regex = escaped.replace(/\\*/g, '.*');
                return new RegExp('^' + regex + '$');
              }

              function shouldShowChatbot() {
                var currentUrl = window.location.href;
                for (var i = 0; i < excludedUrls.length; i++) {
                  if (toRegex(excludedUrls[i]).test(currentUrl)) {
                    return false;
                  }
                }

                if (allowedUrls[0] === '*') {
                  return true;
                }

                for (var j = 0; j < allowedUrls.length; j++) {
                  if (toRegex(allowedUrls[j]).test(currentUrl)) {
                    return true;
                  }
                }

                return false;
              }

              if (!shouldShowChatbot()) return;
              if (document.querySelector('iframe[data-base44-chatbot="true"]')) return;

              var iframe = document.createElement('iframe');
              iframe.src = 'https://preview-sandbox--43d0717956472343265e7d39baa88ab3.base44.app/ChatEmbed';
              iframe.style.cssText = 'position:fixed;bottom:0;right:0;width:420px;height:600px;border:none;z-index:9999;pointer-events:none;';
              iframe.style.setProperty('pointer-events', 'auto', 'important');
              iframe.setAttribute('allowtransparency', 'true');
              iframe.setAttribute('data-base44-chatbot', 'true');
              document.body.appendChild(iframe);
            })();
          `}
        </Script>
      </head>
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
