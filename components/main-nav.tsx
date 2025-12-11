'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { NotificationBell } from './notification-bell';

const links = [
  { href: '/beats', label: 'Beaty' },
  { href: '/projects', label: 'Projekty' },
  { href: '/artists', label: 'Umělci' },
  { href: '/collabs', label: 'Spolupráce' },
  { href: '/faq', label: 'FAQ' },
];

export function MainNav() {
  const supabase = createClient();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
    };
    checkSession();
  }, [supabase]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-20 bg-black/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 relative">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[conic-gradient(from_90deg,var(--mpc-accent),var(--mpc-accent-2),var(--mpc-accent))] text-xs font-black text-[#050505] shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
            B
          </div>
          <div className="leading-tight">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Beat komunita</p>
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-white">Beets.cz</p>
          </div>
        </div>
        <button
          onClick={() => setNavOpen((prev) => !prev)}
          className="md:hidden rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white"
        >
          {navOpen ? 'Zavřít' : 'Menu'}
        </button>
        <nav className="hidden items-center gap-6 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--mpc-muted)] md:flex">
          {links.map((link) => (
            <Link key={link.href} className="relative py-1 hover:text-white" href={link.href}>
              {link.label}
              <span
                className={`absolute inset-x-0 -bottom-1 h-[2px] origin-center scale-x-0 bg-[var(--mpc-accent)] transition-transform duration-200 ${
                  pathname === link.href ? 'scale-x-100' : 'hover:scale-x-100'
                }`}
              />
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 text-right flex-wrap justify-end">
          <NotificationBell className="hidden md:inline-flex" />
          {isLoggedIn ? (
            <Link
              href="/profile"
              className="inline-flex items-center rounded-full border border-white/20 bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_12px_28px_rgba(243,116,51,0.35)]"
            >
              Můj profil
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white hover:border-[var(--mpc-accent)]"
            >
              Přihlásit se
            </Link>
          )}
        </div>
        {navOpen && (
          <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-white/10 bg-black/90 p-4 shadow-lg md:hidden">
            <div className="flex flex-col gap-3 text-sm uppercase tracking-[0.12em] text-[var(--mpc-muted)]">
              {links.map((link) => (
                <Link key={link.href} className="py-1 hover:text-white" href={link.href}>
                  {link.label}
                </Link>
              ))}
              <div className="flex items-center justify-between">
                <span className="text-[11px]">Notifikace</span>
                <NotificationBell />
              </div>
              {isLoggedIn ? (
                <Link
                  href="/profile"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_12px_28px_rgba(243,116,51,0.35)]"
                >
                  Můj profil
                </Link>
              ) : (
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white hover:border-[var(--mpc-accent)]"
                >
                  Přihlásit se
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
