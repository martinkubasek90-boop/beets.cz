/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

import { HotelShell } from "../hotel-shell";
import { hotelImages, hotelRooms, hotelTheme } from "../hotel-data";

const roomAmenities = ["Bezplatná WiFi", "Smart TV", "Vlastní koupelna", "Balkon s výhledem"];

export default function HotelRoomsPage() {
  return (
    <HotelShell active="rooms">
      <main style={{ paddingBottom: 96 }}>
        <header style={{ maxWidth: 1536, margin: "0 auto", padding: "32px 32px 0" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 48 }}>
            <span style={{ color: hotelTheme.secondary, textTransform: "uppercase", letterSpacing: "0.2em", fontSize: 12, fontWeight: 700 }}>Ubytování</span>
            <h1 className="hotel-headline" style={{ color: hotelTheme.primary, fontSize: "clamp(48px,7vw,92px)", lineHeight: 0.95, margin: 0 }}>
              Pokoje & Apartmány
            </h1>
            <p style={{ maxWidth: 720, margin: 0, color: hotelTheme.textMuted, fontSize: 19, lineHeight: 1.8 }}>
              Vyberte si své útočiště uprostřed šumavské divočiny. Každý pokoj je navržen s ohledem na klid, přírodní materiály a nerušený výhled.
            </p>
          </div>

          <div style={{ background: hotelTheme.surfaceSoft, border: `1px solid ${hotelTheme.outline}33`, padding: 32, borderRadius: 20, boxShadow: "0 20px 50px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 24 }}>
              {[
                ["Příjezd", "12. června 2024"],
                ["Odjezd", "19. června 2024"],
                ["Hosté", "2 dospělí, 1 dítě"],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ color: hotelTheme.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" }}>{label}</label>
                  <div style={{ background: "#fff", padding: "16px 18px", borderRadius: 12, border: `1px solid ${hotelTheme.outline}44`, fontWeight: 600 }}>
                    {value}
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "end" }}>
                <Link href="/aiweb/examples/hotel/kontakt#formular" style={{ width: "100%", textAlign: "center", background: hotelTheme.secondary, color: "#fff", textDecoration: "none", padding: "16px 18px", borderRadius: 12, fontWeight: 700 }}>
                  Ověřit dostupnost
                </Link>
              </div>
            </div>
          </div>
        </header>

        <section style={{ maxWidth: 1536, margin: "0 auto", padding: "96px 32px 0", display: "flex", flexDirection: "column", gap: 104 }}>
          {hotelRooms.map((room, index) => (
            <div
              key={room.name}
              style={{
                display: "grid",
                gridTemplateColumns: index % 2 === 1 ? "minmax(0,0.42fr) minmax(0,0.58fr)" : "minmax(0,0.58fr) minmax(0,0.42fr)",
                gap: 56,
                alignItems: "center",
              }}
            >
              <div style={{ order: index % 2 === 1 ? 2 : 1 }}>
                <img src={room.image} alt={room.name} className="hotel-card" style={{ width: "100%", aspectRatio: "16 / 10", objectFit: "cover", borderRadius: 22 }} />
              </div>
              <div style={{ order: index % 2 === 1 ? 1 : 2 }}>
                <span style={{ color: hotelTheme.secondary, textTransform: "uppercase", letterSpacing: "0.2em", fontSize: 11, fontWeight: 700 }}>{room.capacity}</span>
                <h2 className="hotel-headline" style={{ color: hotelTheme.primary, fontSize: 48, margin: "16px 0 20px" }}>{room.name}</h2>
                <p style={{ color: hotelTheme.textMuted, fontSize: 18, lineHeight: 1.8, margin: "0 0 28px" }}>{room.description}</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14, marginBottom: 28 }}>
                  {roomAmenities.map((item) => (
                    <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, color: hotelTheme.textMuted }}>
                      <span style={{ color: hotelTheme.primaryLight }}>•</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 24 }}>
                  <span className="hotel-headline" style={{ color: hotelTheme.primary, fontSize: 42, fontWeight: 700 }}>{room.price}</span>
                  <span style={{ color: hotelTheme.textMuted, letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 12 }}>/ noc</span>
                </div>
                <Link href="/aiweb/examples/hotel/kontakt#formular" style={{ display: "inline-block", background: hotelTheme.primary, color: "#fff", textDecoration: "none", padding: "14px 28px", borderRadius: 10, fontWeight: 700 }}>
                  Zobrazit detail
                </Link>
              </div>
            </div>
          ))}
        </section>

        <section style={{ marginTop: 136, background: hotelTheme.primary, color: "#fff", padding: "112px 32px", overflow: "hidden", position: "relative" }}>
          <div style={{ maxWidth: 1320, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 72, alignItems: "center" }}>
            <div>
              <span style={{ color: "#fed2a7", textTransform: "uppercase", letterSpacing: "0.2em", fontSize: 12, fontWeight: 700 }}>Kvalita spánku</span>
              <h2 className="hotel-headline" style={{ fontSize: "clamp(38px,5vw,64px)", lineHeight: 1.05, margin: "20px 0 24px" }}>
                U nás se spí nejlépe. Taje horského vzduchu.
              </h2>
              <div style={{ color: "#ccead6", fontSize: 18, lineHeight: 1.8 }}>
                <p>Naše poloha v nadmořské výšce 1 050 metrů zajišťuje krystalicky čistý vzduch s optimální vlhkostí, který přirozeně prohlubuje spánek hostů.</p>
                <p>V kombinaci s tichem lesa a přírodními materiály vzniká zážitek, který je pro hotelový branding i prodej pobytů mimořádně silný.</p>
              </div>
              <div style={{ display: "flex", gap: 28, marginTop: 40 }}>
                {[
                  ["98%", "Kyslík"],
                  ["0 db", "Hluk lesa"],
                  ["∞", "Klid"],
                ].map(([value, label]) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div className="hotel-headline" style={{ fontSize: 42, fontWeight: 700 }}>{value}</div>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: "#ccead6" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", inset: -32, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.18)" }} />
              <div style={{ aspectRatio: "1 / 1", borderRadius: "50%", overflow: "hidden", border: `8px solid ${hotelTheme.primaryContainer}`, boxShadow: "0 24px 60px rgba(0,0,0,0.28)" }}>
                <img src={hotelImages.forest} alt="Lesní scenérie" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            </div>
          </div>
        </section>
      </main>
    </HotelShell>
  );
}
