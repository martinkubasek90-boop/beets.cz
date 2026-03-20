/* eslint-disable @next/next/no-img-element */
import { HotelShell } from "../hotel-shell";
import { hotelImages, hotelTheme } from "../hotel-data";

export default function HotelContactPage() {
  return (
    <HotelShell active="contact">
      <main style={{ paddingBottom: 96 }}>
        <section style={{ maxWidth: 1536, margin: "0 auto", padding: "40px 32px 64px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12,minmax(0,1fr))", gap: 56, alignItems: "end" }}>
            <div style={{ gridColumn: "span 7" }}>
              <span style={{ color: hotelTheme.secondary, letterSpacing: "0.2em", textTransform: "uppercase", fontSize: 12, fontWeight: 700, display: "block", marginBottom: 16 }}>
                Get in Touch
              </span>
              <h1 className="hotel-headline" style={{ color: hotelTheme.primary, fontSize: "clamp(52px,7vw,100px)", lineHeight: 0.92, margin: 0 }}>
                Find your sanctuary in the forest.
              </h1>
            </div>
            <div style={{ gridColumn: "span 5", paddingBottom: 10 }}>
              <p style={{ color: hotelTheme.textMuted, fontSize: 20, lineHeight: 1.8, margin: 0 }}>
                Stránka spojuje mapu, kontakty, příjezdové informace a formulář pro přímé rezervace nebo poptávky od hostů.
              </p>
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 1536, margin: "0 auto", padding: "0 32px 88px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12,minmax(0,1fr))", gap: 24, minHeight: 700 }}>
            <div style={{ gridColumn: "span 8", position: "relative", overflow: "hidden", borderRadius: 22 }}>
              <img src={hotelImages.map} alt="Mapa lokality hotelu" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(0.2) brightness(0.92)" }} />
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div style={{ background: hotelTheme.primary, color: "#fff", padding: 16, boxShadow: "0 14px 32px rgba(0,0,0,0.18)" }}>📍</div>
                <div style={{ background: "#fff", padding: "10px 16px", border: `1px solid ${hotelTheme.outline}44`, boxShadow: "0 10px 24px rgba(0,0,0,0.08)" }}>
                  <span className="hotel-headline" style={{ color: hotelTheme.primary, fontWeight: 700 }}>The Alpine Editorial</span>
                </div>
              </div>
            </div>
            <div style={{ gridColumn: "span 4", display: "grid", gridTemplateRows: "repeat(2,minmax(0,1fr))", gap: 24 }}>
              <div style={{ background: hotelTheme.primaryContainer, color: "#fff", padding: 36, borderRadius: 22, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 34, marginBottom: 18 }}>☎</div>
                  <h3 className="hotel-headline" style={{ fontSize: 32, margin: "0 0 8px" }}>Phone & Email</h3>
                  <p style={{ margin: "0 0 6px", color: "#ccead6", fontSize: 18 }}>+420 777 123 456</p>
                  <p style={{ margin: 0, color: "#ccead6", fontSize: 18 }}>hello@alpineeditorial.com</p>
                </div>
                <button style={{ width: "100%", padding: "16px 20px", background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.24)", textTransform: "uppercase", letterSpacing: "0.16em", fontSize: 11, fontWeight: 700 }}>
                  Copy to clipboard
                </button>
              </div>
              <div style={{ background: hotelTheme.surfaceSoft, color: hotelTheme.text, padding: 36, borderRadius: 22, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 34, marginBottom: 18, color: hotelTheme.secondary }}>🧭</div>
                  <h3 className="hotel-headline" style={{ fontSize: 32, margin: "0 0 10px", color: hotelTheme.primary }}>Our Address</h3>
                  <p style={{ margin: 0, color: hotelTheme.textMuted, lineHeight: 1.7, fontSize: 18 }}>
                    Modrava 124,
                    <br />
                    Šumava National Park,
                    <br />
                    Czech Republic
                  </p>
                </div>
                <span style={{ color: hotelTheme.primary, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontSize: 12 }}>
                  Open in Google Maps →
                </span>
              </div>
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 1536, margin: "0 auto", padding: "0 32px 88px", display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 72 }}>
          <div>
            <div style={{ marginBottom: 40 }}>
              <h2 className="hotel-headline" style={{ color: hotelTheme.primary, fontSize: 48, margin: "0 0 12px" }}>Send us a message</h2>
              <p style={{ color: hotelTheme.textMuted, margin: 0, fontSize: 17, lineHeight: 1.8 }}>
                Typická kontaktní stránka pro hotel. Formulář je připravený pro přímou rezervaci nebo nezávaznou poptávku.
              </p>
            </div>
            <form id="formular" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 24 }}>
                {[
                  ["Full Name", "John Doe", "text"],
                  ["Email Address", "john@example.com", "email"],
                ].map(([label, placeholder, type]) => (
                  <div key={label} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ color: hotelTheme.secondary, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" }}>{label}</label>
                    <input type={type} placeholder={placeholder} style={{ background: hotelTheme.surfaceStrong, border: "none", padding: 18, borderRadius: 12, fontSize: 15 }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ color: hotelTheme.secondary, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" }}>Your Message</label>
                <textarea rows={6} placeholder="Tell us about your planned visit..." style={{ background: hotelTheme.surfaceStrong, border: "none", padding: 18, borderRadius: 12, fontSize: 15, resize: "vertical" }} />
              </div>
              <button type="button" style={{ alignSelf: "flex-start", background: hotelTheme.primary, color: "#fff", padding: "18px 34px", border: "none", borderRadius: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                Send Inquiry
              </button>
            </form>
          </div>

          <div style={{ background: hotelTheme.surfaceSoft, padding: "48px 56px", borderRadius: 22 }}>
            <h2 className="hotel-headline" style={{ color: hotelTheme.primary, fontSize: 48, margin: "0 0 28px" }}>How to reach us</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              {[
                ["By Car", "From Prague (2.5h): Take the D4 to Strakonice, then follow Route 169 towards Modrava. Private parking is available on-site for all guests."],
                ["By Train", "Take the direct express to Železná Ruda. We offer a complimentary shuttle service from the station with 24h advance notice."],
              ].map(([title, text]) => (
                <div key={title} style={{ display: "flex", gap: 20 }}>
                  <div style={{ width: 52, height: 52, background: "rgba(120,88,54,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: hotelTheme.secondary, flexShrink: 0 }}>
                    {title === "By Car" ? "🚗" : "🚆"}
                  </div>
                  <div>
                    <h4 className="hotel-headline" style={{ color: hotelTheme.primary, fontSize: 28, margin: "0 0 6px" }}>{title}</h4>
                    <p style={{ margin: 0, color: hotelTheme.textMuted, lineHeight: 1.8 }}>{text}</p>
                  </div>
                </div>
              ))}
              <div style={{ paddingTop: 24, borderTop: `1px solid ${hotelTheme.outline}55`, color: hotelTheme.secondary, fontSize: 12, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                Electric charging point available on-site
              </div>
            </div>
          </div>
        </section>

        <section style={{ background: hotelTheme.primary, padding: "112px 32px", color: "#fff" }}>
          <div style={{ maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
            <div style={{ color: "#fed2a7", fontSize: 22, marginBottom: 18 }}>★★★★★</div>
            <blockquote className="hotel-headline" style={{ fontSize: "clamp(34px,4vw,60px)", fontStyle: "italic", lineHeight: 1.3, margin: "0 0 20px" }}>
              A truly transformative experience. The silence of the forest starts at the front door. We&apos;ve never slept better.
            </blockquote>
            <cite style={{ fontStyle: "normal", color: "#ccead6", textTransform: "uppercase", letterSpacing: "0.28em", fontSize: 12 }}>
              Elena & Marcus, Berlin
            </cite>
          </div>
        </section>
      </main>
    </HotelShell>
  );
}
