"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock3, FileText, ShoppingBag, Tag } from "lucide-react";

const navItems = [
  { label: "Akční", href: "/Memodo/akcni-produkty", icon: Tag },
  { label: "Katalog", href: "/Memodo/katalog", icon: ShoppingBag },
  { label: "Poptávka", href: "/Memodo/poptavka", icon: FileText },
  { label: "Moje", href: "/Memodo/moje-poptavky", icon: Clock3 },
];

export function MemodoBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 border-t border-gray-200 bg-white">
      <div className="flex items-center justify-around px-4 py-2">
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
      </div>
    </nav>
  );
}
