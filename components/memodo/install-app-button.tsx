"use client";

import { useEffect, useState } from "react";
import { Copy, Download, Info } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

export function MemodoInstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isIosSafari, setIsIosSafari] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = window.navigator.userAgent.toLowerCase();
    const iOSDevice = /iphone|ipad|ipod/.test(ua);
    const safariBrowser = iOSDevice && ua.includes("safari") && !ua.includes("crios") && !ua.includes("fxios");
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as NavigatorWithStandalone).standalone);

    setIsIos(iOSDevice);
    setIsIosSafari(safariBrowser);
    setInstalled(Boolean(standalone));

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/memodo-sw.js", { scope: "/Memodo/" }).catch(() => {
        // SW registration failure should not block page usage.
      });
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
    }
    setPromptEvent(null);
  };

  const copyCurrentUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable in some contexts.
    }
  };

  if (installed) {
    return (
      <span className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
        Aplikace nainstalována
      </span>
    );
  }

  if (promptEvent) {
    return (
      <button
        type="button"
        onClick={handleInstall}
        className="inline-flex items-center gap-1 rounded-xl bg-[#FFE500] px-3 py-2 text-xs font-bold text-black hover:bg-yellow-400"
      >
        <Download className="h-3.5 w-3.5" />
        Instalovat
      </button>
    );
  }

  if (isIos) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowIosHelp((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700"
        >
          <Info className="h-3.5 w-3.5" />
          Jak instalovat
        </button>
        {showIosHelp ? (
          <div className="absolute right-0 top-11 w-56 rounded-xl border border-gray-200 bg-white p-3 text-[11px] leading-relaxed text-gray-600 shadow-lg">
            {isIosSafari ? (
              <p>V Safari klikni na Sdílet a vyber Přidat na plochu.</p>
            ) : (
              <div className="space-y-2">
                <p>Pro instalaci otevři tuto stránku v Safari a pak dej Přidat na plochu.</p>
                <button
                  type="button"
                  onClick={copyCurrentUrl}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-700"
                >
                  <Copy className="h-3 w-3" />
                  {copied ? "URL zkopírována" : "Kopírovat URL"}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return null;
}
