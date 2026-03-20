"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export interface Gallery4Item {
  id: string;
  title: string;
  description: string;
  href: string;
  image: string;
}

export interface Gallery4Props {
  id?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  items: Gallery4Item[];
  ctaHref?: string;
  ctaLabel?: string;
}

const CARD_WIDTH = 360;

const Gallery4 = ({
  id,
  eyebrow = "Příklady webů",
  title = "Ukázky webů",
  description = "Projděte si konkrétní vizuály a koncepty jednotlivých webů. Každá ukázka vede do samostatného dema.",
  items,
  ctaHref,
  ctaLabel,
}: Gallery4Props) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(items.length > 1);

  useEffect(() => {
    const node = trackRef.current;
    if (!node) {
      return;
    }

    const updateState = () => {
      const cardSize = CARD_WIDTH + 24;
      const nextIndex = Math.round(node.scrollLeft / cardSize);
      setCurrentSlide(Math.max(0, Math.min(items.length - 1, nextIndex)));
      setCanScrollPrev(node.scrollLeft > 8);
      setCanScrollNext(node.scrollLeft + node.clientWidth < node.scrollWidth - 8);
    };

    updateState();
    node.addEventListener("scroll", updateState, { passive: true });
    window.addEventListener("resize", updateState);

    return () => {
      node.removeEventListener("scroll", updateState);
      window.removeEventListener("resize", updateState);
    };
  }, [items.length]);

  const scrollToIndex = (index: number) => {
    const node = trackRef.current;
    if (!node) {
      return;
    }

    node.scrollTo({
      left: index * (CARD_WIDTH + 24),
      behavior: "smooth",
    });
  };

  return (
    <section id={id} style={{ padding: "40px 24px 56px", position: "relative" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p
            style={{
              color: "#a78bfa",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "2px",
              textTransform: "uppercase",
              margin: "0 0 12px",
            }}
          >
            {eyebrow}
          </p>
          <h2
            style={{
              fontSize: "clamp(30px,5vw,52px)",
              fontWeight: 900,
              letterSpacing: "-1px",
              margin: "0 0 14px",
              color: "#f8fafc",
            }}
          >
            {title}
          </h2>
          <p
            style={{
              maxWidth: 720,
              margin: "0 auto",
              color: "#94a3b8",
              fontSize: 16,
              lineHeight: 1.7,
            }}
          >
            {description}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 10,
            marginBottom: 22,
            flexWrap: "wrap",
          }}
        >
          <Button
            size="icon"
            variant="ghost"
            onClick={() => scrollToIndex(Math.max(0, currentSlide - 1))}
            disabled={!canScrollPrev}
            className="border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white disabled:pointer-events-auto"
            aria-label="Předchozí ukázka"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => scrollToIndex(Math.min(items.length - 1, currentSlide + 1))}
            disabled={!canScrollNext}
            className="border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white disabled:pointer-events-auto"
            aria-label="Další ukázka"
          >
            <ArrowRight className="size-5" />
          </Button>
        </div>

        <div
          ref={trackRef}
          style={{
            display: "flex",
            gap: 24,
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            padding: "0 4px 8px",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                minWidth: "min(86vw, 360px)",
                maxWidth: 360,
                flex: "0 0 min(86vw, 360px)",
                scrollSnapAlign: "center",
              }}
            >
              <Link href={item.href} style={{ textDecoration: "none", display: "block", height: "100%" }}>
                <div
                  style={{
                    borderRadius: 24,
                    overflow: "hidden",
                    minHeight: 520,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(167,139,250,0.12)",
                    boxShadow: "0 18px 80px rgba(15,23,42,0.35)",
                    height: "100%",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      minHeight: 360,
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      background: "#020617",
                    }}
                  >
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 86vw, 360px"
                      style={{
                        position: "absolute",
                        inset: 0,
                        objectFit: "cover",
                        transition: "transform 300ms ease",
                      }}
                    />
                  </div>
                  <div style={{ padding: 24 }}>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 800,
                        lineHeight: 1.2,
                        color: "#f8fafc",
                        marginBottom: 12,
                      }}
                    >
                      {item.title}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        color: "#94a3b8",
                        fontSize: 15,
                        lineHeight: 1.7,
                        minHeight: 78,
                      }}
                    >
                      {item.description}
                    </p>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 18,
                        color: "#a78bfa",
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      Zobrazit demo <ArrowRight className="size-4" />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={currentSlide === index ? "bg-white" : "bg-white/20"}
              onClick={() => scrollToIndex(index)}
              aria-label={`Přejít na ukázku ${index + 1}`}
              style={{
                width: 9,
                height: 9,
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                transition: "opacity 200ms ease",
              }}
            />
          ))}
        </div>

        {ctaHref && ctaLabel ? (
          <div style={{ marginTop: 26, textAlign: "center" }}>
            <Link
              href={ctaHref}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 22px",
                borderRadius: 999,
                color: "#f8fafc",
                textDecoration: "none",
                fontWeight: 700,
                border: "1px solid rgba(167,139,250,0.2)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              {ctaLabel}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export { Gallery4 };
