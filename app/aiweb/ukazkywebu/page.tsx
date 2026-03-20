import Image from "next/image";
import Link from "next/link";

import { Gallery4 } from "@/components/aiweb/gallery4";

import { EXAMPLES } from "../examples/data";
import { GALLERY_ITEMS } from "../examples/gallery-items";

export default function AiwebUkazkyWebuPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(124,58,237,0.16), transparent 28%), linear-gradient(180deg, #04050f 0%, #050816 100%)",
        color: "#e2e8f0",
      }}
    >
      <section style={{ padding: "120px 24px 28px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", textAlign: "center" }}>
          <Link
            href="/aiweb"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              color: "#a78bfa",
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 24,
            }}
          >
            ← Zpět na AIWEB
          </Link>
          <p
            style={{
              margin: "0 0 12px",
              color: "#a78bfa",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "2px",
              textTransform: "uppercase",
            }}
          >
            Přehled webů
          </p>
          <h1
            style={{
              margin: "0 0 18px",
              fontSize: "clamp(42px,7vw,76px)",
              lineHeight: 1.02,
              letterSpacing: "-2px",
              fontWeight: 900,
              color: "#f8fafc",
            }}
          >
            Ukázky webů pro různé obory
          </h1>
          <p
            style={{
              maxWidth: 760,
              margin: "0 auto",
              color: "#94a3b8",
              fontSize: 18,
              lineHeight: 1.75,
            }}
          >
            Tohle je kompletní přehled našich demo webů. Každá ukázka má vlastní vizuál a vede do samostatné prezentace konkrétního stylu webu.
          </p>
        </div>
      </section>

      <Gallery4
        title="Vizuální galerie webů"
        description="Carousel ukazuje samostatné vizuály webů, aby bylo hned vidět, jak se liší styl podle oboru."
        items={GALLERY_ITEMS}
      />

      <section style={{ padding: "0 24px 88px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
              gap: 22,
            }}
          >
            {EXAMPLES.map((example, index) => (
              <Link
                key={example.slug}
                href={`/aiweb/examples/${example.slug}`}
                style={{ textDecoration: "none" }}
              >
                <article
                  style={{
                    height: "100%",
                    borderRadius: 24,
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(167,139,250,0.12)",
                    boxShadow: "0 18px 80px rgba(15,23,42,0.28)",
                  }}
                >
                  <div
                    style={{
                      height: 230,
                      background: `linear-gradient(135deg, ${example.bg}, ${example.surface})`,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <Image
                      src={GALLERY_ITEMS[index]?.image}
                      alt={example.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                  <div style={{ padding: 24 }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 12px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.05)",
                        color: example.primaryLight,
                        fontSize: 12,
                        fontWeight: 700,
                        marginBottom: 14,
                        textTransform: "uppercase",
                        letterSpacing: "1.2px",
                      }}
                    >
                      {example.industry}
                    </div>
                    <h2
                      style={{
                        margin: "0 0 10px",
                        color: "#f8fafc",
                        fontSize: 24,
                        fontWeight: 800,
                        letterSpacing: "-0.5px",
                      }}
                    >
                      {example.name}
                    </h2>
                    <p style={{ margin: "0 0 10px", color: "#cbd5e1", fontSize: 16, lineHeight: 1.5 }}>
                      {example.tagline}
                    </p>
                    <p style={{ margin: 0, color: "#94a3b8", fontSize: 14, lineHeight: 1.7 }}>
                      {example.description}
                    </p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
