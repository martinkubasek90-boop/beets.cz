import Link from "next/link";
import type { ReactNode } from "react";

import { hotelNav, hotelTheme, type HotelNavKey } from "./hotel-data";

export function HotelShell({
  active,
  children,
}: {
  active: HotelNavKey;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: hotelTheme.bg,
        color: hotelTheme.text,
        fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
      }}
    >
      <style>{`
        .hotel-headline{font-family: Georgia, "Times New Roman", serif}
        .hotel-link{transition:color 0.2s ease,border-color 0.2s ease}
        .hotel-link:hover{color:${hotelTheme.primary}}
        .hotel-card{transition:transform 0.35s ease, box-shadow 0.35s ease}
        .hotel-card:hover{transform:translateY(-4px); box-shadow:0 18px 48px rgba(0,0,0,0.08)}
      `}</style>

      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 1000 }}>
        <Link
          href="/aiweb#priklady"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 999,
            background: "rgba(124,58,237,0.92)",
            border: "1px solid rgba(167,139,250,0.35)",
            color: "#fff",
            textDecoration: "none",
            fontSize: 12,
            fontWeight: 700,
            boxShadow: "0 6px 24px rgba(124,58,237,0.3)",
          }}
        >
          ⚡ Web od AIWEB.CZ
        </Link>
      </div>

      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: "rgba(252,249,244,0.8)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            maxWidth: 1536,
            margin: "0 auto",
            padding: "24px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <Link
            href="/aiweb/examples/hotel"
            className="hotel-headline"
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              color: hotelTheme.primary,
              textDecoration: "none",
            }}
          >
            The Alpine Editorial
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
            {hotelNav.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="hotel-headline hotel-link"
                style={{
                  textDecoration: "none",
                  color: item.key === active ? hotelTheme.primary : "rgba(23,49,36,0.6)",
                  borderBottom:
                    item.key === active ? `2px solid ${hotelTheme.secondary}` : "2px solid transparent",
                  paddingBottom: 4,
                  fontSize: 18,
                  fontWeight: 500,
                  letterSpacing: "-0.03em",
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <Link
            href="/aiweb/examples/hotel/kontakt#formular"
            style={{
              background: hotelTheme.primary,
              color: hotelTheme.white,
              textDecoration: "none",
              padding: "12px 22px",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Book Now
          </Link>
        </div>
      </nav>

      <div style={{ paddingTop: 108 }}>{children}</div>

      <footer style={{ background: "#173124", color: "#fcf9f4", padding: "96px 48px 48px" }}>
        <div
          style={{
            maxWidth: 1536,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 40,
          }}
        >
          <div style={{ maxWidth: 420 }}>
            <div className="hotel-headline" style={{ fontSize: 30, fontWeight: 700, marginBottom: 16 }}>
              The Alpine Editorial
            </div>
            <p style={{ margin: 0, color: "rgba(252,249,244,0.72)", lineHeight: 1.8 }}>
              Luxusní útočiště v hlubokých lesích Šumavy. Vícestránkový template pro hotel, resort nebo boutique retreat.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.5 }}>
              Navigace
            </div>
            {hotelNav.map((item) => (
              <Link key={item.key} href={item.href} style={{ color: "rgba(252,249,244,0.72)", textDecoration: "none" }}>
                {item.label}
              </Link>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.5 }}>
              Odkazy
            </div>
            {["Privacy Policy", "Terms of Service", "Sustainability Charter", "Local Guide"].map((label) => (
              <span key={label} style={{ color: "rgba(252,249,244,0.72)" }}>
                {label}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.5 }}>
              Kontakt
            </div>
            <span style={{ color: "rgba(252,249,244,0.72)" }}>Šumava 42, Horská Kvilda</span>
            <span style={{ color: "rgba(252,249,244,0.72)" }}>+420 123 456 789</span>
            <span style={{ color: "rgba(252,249,244,0.72)" }}>hello@alpineeditorial.cz</span>
          </div>
        </div>
        <div
          style={{
            maxWidth: 1536,
            margin: "80px auto 0",
            paddingTop: 24,
            borderTop: "1px solid rgba(252,249,244,0.1)",
            textAlign: "center",
            color: "rgba(252,249,244,0.48)",
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          © 2024 The Alpine Editorial. Sanctuary in the Bohemian Forest.
        </div>
      </footer>
    </div>
  );
}
