"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock3, FileText, Mic, MicOff, ShoppingBag, Tag } from "lucide-react";

const navItems = [
  { label: "Akce", href: "/Memodo/akcni-produkty", icon: Tag },
  { label: "Produkty", href: "/Memodo/katalog", icon: ShoppingBag },
  { label: "Poptávka", href: "/Memodo/poptavka", icon: FileText },
  { label: "Můj účet", href: "/Memodo/moje-poptavky", icon: Clock3 },
];

export function MemodoBottomNav() {
  const pathname = usePathname();
  const [voiceListening, setVoiceListening] = useState(false);

  useEffect(() => {
    const onVoiceState = (event: Event) => {
      const detail = (event as CustomEvent<{ listening?: boolean }>).detail;
      setVoiceListening(Boolean(detail?.listening));
    };
    window.addEventListener("memodo-voice-state", onVoiceState as EventListener);
    return () => window.removeEventListener("memodo-voice-state", onVoiceState as EventListener);
  }, []);

  const startVoice = () => window.dispatchEvent(new CustomEvent("memodo-voice-start"));
  const stopVoice = () => window.dispatchEvent(new CustomEvent("memodo-voice-stop"));

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 border-t border-gray-200 bg-white">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[44px] flex-col items-center gap-1 rounded-xl px-4 py-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 ${
                active ? "text-black" : "text-gray-500 hover:text-black"
              }`}
            >
              <div className={`rounded-xl p-2 ${active ? "bg-[#FFE500]" : ""}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onMouseDown={startVoice}
          onMouseUp={stopVoice}
          onMouseLeave={stopVoice}
          onTouchStart={(event) => {
            event.preventDefault();
            startVoice();
          }}
          onTouchEnd={(event) => {
            event.preventDefault();
            stopVoice();
          }}
          onTouchCancel={(event) => {
            event.preventDefault();
            stopVoice();
          }}
          className={`flex min-h-[44px] flex-col items-center gap-1 rounded-xl px-3 py-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 ${
            voiceListening ? "text-red-600" : "text-gray-500 hover:text-black"
          }`}
          aria-label={voiceListening ? "Nahrávání hlasu" : "Hledat hlasem"}
          title={voiceListening ? "Nahrávám - pusťte pro vyhledání" : "Podržte pro hlasové hledání"}
        >
          <div className={`rounded-xl p-2 ${voiceListening ? "bg-red-100" : ""}`}>
            {voiceListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </div>
          <span className="text-[10px] font-medium">{voiceListening ? "Mluvím" : "Hlas"}</span>
        </button>
      </div>
    </nav>
  );
}
