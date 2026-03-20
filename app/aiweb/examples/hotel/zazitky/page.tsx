/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

import { HotelShell } from "../hotel-shell";
import { hotelExperiences, hotelImages, hotelTheme } from "../hotel-data";

export default function HotelExperiencePage() {
  return (
    <HotelShell active="experience">
      <main>
        <section style={{ position: "relative", minHeight: 520, display: "flex", alignItems: "end", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0 }}>
            <img src={hotelImages.sunset} alt="Hotel a okolní krajina" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(23,49,36,0.18), rgba(23,49,36,0.72))" }} />
          </div>
          <div style={{ position: "relative", zIndex: 1, maxWidth: 1536, margin: "0 auto", padding: "0 32px 56px", width: "100%" }}>
            <span style={{ color: "#fed2a7", textTransform: "uppercase", letterSpacing: "0.2em", fontSize: 12, fontWeight: 700 }}>Zážitky na míru</span>
            <h1 className="hotel-headline" style={{ color: "#fff", fontSize: "clamp(52px,7vw,96px)", lineHeight: 0.94, margin: "18px 0 16px" }}>
              Pobyt, na který hosté vzpomínají
            </h1>
            <p style={{ color: "#d7e7dc", maxWidth: 760, fontSize: 20, lineHeight: 1.8, margin: 0 }}>
              Tato podstránka je určená pro wellness, gastronomii, přírodu a vše, co z obyčejného ubytování dělá skutečný důvod k rezervaci.
            </p>
          </div>
        </section>

        <section style={{ maxWidth: 1536, margin: "0 auto", padding: "96px 32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 24, autoRows: 300 }}>
            <div style={{ gridColumn: "span 2", position: "relative", overflow: "hidden", borderRadius: 22 }}>
              <img src={hotelExperiences[0].image} alt={hotelExperiences[0].title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0.15))" }} />
              <div style={{ position: "absolute", left: 28, bottom: 24, right: 28, color: "#fff" }}>
                <h3 className="hotel-headline" style={{ fontSize: 38, margin: "0 0 8px" }}>{hotelExperiences[0].title}</h3>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.82)", lineHeight: 1.8 }}>{hotelExperiences[0].text}</p>
              </div>
            </div>
            {hotelExperiences.slice(1).map((item) => (
              <div key={item.title} style={{ position: "relative", overflow: "hidden", borderRadius: 22 }}>
                <img src={item.image} alt={item.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0.15))" }} />
                <div style={{ position: "absolute", left: 24, bottom: 24, right: 24, color: "#fff" }}>
                  <h3 className="hotel-headline" style={{ fontSize: 30, margin: "0 0 8px" }}>{item.title}</h3>
                  <p style={{ margin: 0, color: "rgba(255,255,255,0.84)", lineHeight: 1.7 }}>{item.text}</p>
                </div>
              </div>
            ))}
            <div style={{ gridColumn: "span 2", background: hotelTheme.primary, color: "#fff", borderRadius: 22, padding: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ maxWidth: 720, textAlign: "center" }}>
                <h3 className="hotel-headline" style={{ fontSize: 40, margin: "0 0 16px" }}>Udržitelnost jako součást značky</h3>
                <p style={{ margin: 0, color: "#ccead6", lineHeight: 1.85, fontSize: 18 }}>
                  Hotel může na této stránce vysvětlit svůj přístup k lokálním dodavatelům, šetrnému provozu a pobytu v souladu s krajinou. To zvyšuje důvěru i odlišení od konkurence.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section style={{ background: "#fff", padding: "96px 32px" }}>
          <div style={{ maxWidth: 1320, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 24 }}>
            {[
              {
                title: "Ranní rituály",
                text: "Snídaně z lokálních farem, káva s výhledem a klidné tempo dne od prvního okamžiku.",
              },
              {
                title: "Odpolední objevování",
                text: "Túry, kola, jezera, lesní stezky i concierge doporučení pro hosty, kteří chtějí víc než jen přespat.",
              },
              {
                title: "Večerní návrat",
                text: "Wellness, krb, degustační menu nebo tichý lounge. Web zde prodává závěr dne a pocit návratu.",
              },
            ].map((item) => (
              <article key={item.title} className="hotel-card" style={{ background: hotelTheme.surfaceSoft, border: `1px solid ${hotelTheme.outline}33`, borderRadius: 20, padding: 28 }}>
                <h3 className="hotel-headline" style={{ color: hotelTheme.primary, fontSize: 30, margin: "0 0 12px" }}>{item.title}</h3>
                <p style={{ margin: 0, color: hotelTheme.textMuted, lineHeight: 1.8 }}>{item.text}</p>
              </article>
            ))}
          </div>
          <div style={{ maxWidth: 1320, margin: "40px auto 0", textAlign: "center" }}>
            <Link href="/aiweb/examples/hotel/kontakt#formular" style={{ display: "inline-block", background: hotelTheme.secondary, color: "#fff", textDecoration: "none", padding: "16px 30px", borderRadius: 10, fontWeight: 700 }}>
              Navrhnout pobyt na míru
            </Link>
          </div>
        </section>
      </main>
    </HotelShell>
  );
}
