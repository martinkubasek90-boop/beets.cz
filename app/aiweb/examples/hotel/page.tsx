/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

import { HotelShell } from "./hotel-shell";
import { hotelExperiences, hotelImages, hotelTheme } from "./hotel-data";

export default function HotelHomePage() {
  return (
    <HotelShell active="home">
      <header style={{ position: "relative", minHeight: 700, display: "flex", alignItems: "center", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <img src={hotelImages.hero} alt="Šumavská hotelová scenérie" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg, rgba(23,49,36,0.75), rgba(23,49,36,0.18))" }} />
        </div>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1536, margin: "0 auto", padding: "0 32px", width: "100%" }}>
          <div style={{ maxWidth: 760 }}>
            <span style={{ display: "inline-block", color: "#ccead6", letterSpacing: "0.2em", textTransform: "uppercase", fontSize: 12, fontWeight: 700, marginBottom: 24 }}>
              Šumavská divočina
            </span>
            <h1 className="hotel-headline" style={{ color: "#fff", fontSize: "clamp(54px,8vw,110px)", lineHeight: 0.95, margin: "0 0 28px", fontWeight: 700 }}>
              Váš domov uprostřed Šumavské divočiny
            </h1>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <Link href="/aiweb/examples/hotel/pokoje" style={{ background: hotelTheme.secondary, color: "#fff", textDecoration: "none", padding: "18px 32px", fontWeight: 700 }}>
                Prozkoumat pokoje
              </Link>
              <a href="#ubytovani" style={{ border: "1px solid rgba(255,255,255,0.35)", color: "#fff", textDecoration: "none", padding: "18px 32px", fontWeight: 700, backdropFilter: "blur(10px)" }}>
                O nás
              </a>
            </div>
          </div>
        </div>
      </header>

      <section id="ubytovani" style={{ padding: "96px 32px 120px", background: hotelTheme.bg }}>
        <div style={{ maxWidth: 1536, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 40, alignItems: "center" }}>
          <div style={{ maxWidth: 620 }}>
            <h2 className="hotel-headline" style={{ color: hotelTheme.primary, fontSize: "clamp(38px,5vw,66px)", lineHeight: 1.05, margin: "0 0 24px" }}>
              Ubytujte se u nás
            </h2>
            <p style={{ color: hotelTheme.textMuted, fontSize: 18, lineHeight: 1.8, margin: "0 0 24px" }}>
              Vstupte do světa, kde se čas zpomaluje v rytmu praskajícího dřeva a šumění věkovitých smrků. Pokoje jsou navrženy tak, aby propojily moderní komfort s hrubou krásou Šumavy.
            </p>
            <p style={{ color: hotelTheme.textMuted, fontSize: 18, lineHeight: 1.8, margin: "0 0 36px" }}>
              Každý detail, od lněného povlečení až po výhledy do hlubokých údolí, vypráví příběh o klidu, návratu k podstatě a hotelu, kam se hosté chtějí vracet.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 48, height: 1, background: hotelTheme.secondary }} />
              <span style={{ color: hotelTheme.secondary, fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", fontStyle: "italic" }}>
                Dotek přírody v každém detailu
              </span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 20 }}>
            {[hotelImages.roomA, hotelImages.roomB].map((src, index) => (
              <div key={src} style={{ paddingTop: index === 0 ? 48 : 0 }}>
                <img src={src} alt="Interiér hotelového pokoje" className="hotel-card" style={{ width: "100%", height: 450, objectFit: "cover", borderRadius: 20, boxShadow: "0 24px 60px rgba(0,0,0,0.12)" }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "96px 32px 120px", background: hotelTheme.surfaceSoft }}>
        <div style={{ maxWidth: 1536, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ color: hotelTheme.secondary, letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 12, fontWeight: 700 }}>
              Zážitky na míru
            </span>
            <h2 className="hotel-headline" style={{ color: hotelTheme.primary, fontSize: "clamp(38px,5vw,72px)", margin: "18px 0 0" }}>
              Naše zážitky
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 24 }}>
            <div style={{ gridColumn: "span 2", position: "relative", overflow: "hidden", borderRadius: 20, minHeight: 320 }}>
              <img src={hotelExperiences[0].image} alt={hotelExperiences[0].title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0.15))" }} />
              <div style={{ position: "absolute", left: 32, bottom: 28, right: 32, color: "#fff" }}>
                <h3 className="hotel-headline" style={{ fontSize: 36, margin: "0 0 8px" }}>{hotelExperiences[0].title}</h3>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.84)", fontSize: 17, lineHeight: 1.7 }}>{hotelExperiences[0].text}</p>
              </div>
            </div>
            {hotelExperiences.slice(1).map((item) => (
              <div key={item.title} style={{ position: "relative", overflow: "hidden", borderRadius: 20, minHeight: 320 }}>
                <img src={item.image} alt={item.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0.15))" }} />
                <div style={{ position: "absolute", left: 28, bottom: 24, right: 28, color: "#fff" }}>
                  <h3 className="hotel-headline" style={{ fontSize: 28, margin: "0 0 8px" }}>{item.title}</h3>
                  <p style={{ margin: 0, color: "rgba(255,255,255,0.84)", lineHeight: 1.7 }}>{item.text}</p>
                </div>
              </div>
            ))}
            <div style={{ gridColumn: "span 2", borderRadius: 20, background: hotelTheme.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 48, minHeight: 320 }}>
              <div style={{ textAlign: "center", maxWidth: 640 }}>
                <div style={{ fontSize: 44, marginBottom: 18 }}>eco</div>
                <h3 className="hotel-headline" style={{ fontSize: 38, margin: "0 0 16px" }}>Udržitelnost</h3>
                <p style={{ margin: 0, color: "#ccead6", fontSize: 18, lineHeight: 1.8 }}>
                  Hotel může komunikovat provoz v souladu s přírodou, lokální dodavatele, úsporné technologie i ochranu krajiny, která tvoří samotný zážitek hosta.
                </p>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 32, textAlign: "center" }}>
            <Link href="/aiweb/examples/hotel/zazitky" style={{ color: hotelTheme.primary, fontWeight: 700, textDecoration: "none" }}>
              Zobrazit samostatnou stránku zážitků →
            </Link>
          </div>
        </div>
      </section>

      <section style={{ padding: "112px 32px", background: "#fff" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <div style={{ position: "absolute", top: -70, left: "50%", transform: "translateX(-50%)", color: "rgba(120,88,54,0.16)", fontSize: 120 }}>“</div>
          <blockquote style={{ position: "relative", zIndex: 1 }}>
            <p className="hotel-headline" style={{ color: hotelTheme.primary, fontSize: "clamp(34px,4vw,60px)", lineHeight: 1.25, fontStyle: "italic", margin: "0 0 28px" }}>
              Hory nejsou jen kusy kamene a lesa. Jsou to chrámy, kde člověk nachází svou pravou tvář.
            </p>
            <footer style={{ color: hotelTheme.secondary, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", fontSize: 12 }}>
              Odkaz horalů
            </footer>
          </blockquote>
        </div>
      </section>

      <section style={{ position: "relative", padding: "112px 32px", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <img src={hotelImages.sunset} alt="Západ slunce nad Šumavou" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(23,49,36,0.42)" }} />
        </div>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 960, margin: "0 auto", textAlign: "center", color: "#fff" }}>
          <h2 className="hotel-headline" style={{ fontSize: "clamp(40px,5vw,72px)", margin: "0 0 24px" }}>
            Nechte město za zády
          </h2>
          <p style={{ maxWidth: 720, margin: "0 auto 36px", color: "#d7e7dc", fontSize: 22, lineHeight: 1.7 }}>
            Rezervujte si svůj kousek klidu ještě dnes a zažijte Šumavu tak, jak ji neznáte. CTA vede přímo na kontaktní stránku s formulářem.
          </p>
          <Link href="/aiweb/examples/hotel/kontakt#formular" style={{ display: "inline-block", background: "#fff", color: hotelTheme.primary, textDecoration: "none", padding: "18px 36px", fontWeight: 700, boxShadow: "0 18px 40px rgba(0,0,0,0.18)" }}>
            Rezervovat pobyt
          </Link>
        </div>
      </section>
    </HotelShell>
  );
}
