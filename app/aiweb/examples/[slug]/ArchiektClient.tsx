'use client';

import Link from 'next/link';
import { useState } from 'react';
import { GooeyText } from '@/components/aiweb/gooey-text';
import { GradientButton } from '@/components/aiweb/gradient-button';
import { TestimonialsColumn, type AnimatedTestimonial } from '@/components/aiweb/testimonials-column';
import { ThemeToggle } from '@/components/aiweb/theme-toggle';
import type { ExampleSite } from '../data';

const PORTFOLIO = [
  { id: '1524758631624-e2822e304c36', name: 'Vila Strahov', year: '2023', type: 'Novostavba' },
  { id: '1503387762-592deb58ef4e', name: 'Loft Holešovice', year: '2022', type: 'Rekonstrukce' },
  { id: '1537432647209-eed929d3e8b1', name: 'Penthouse Vinohrady', year: '2024', type: 'Interiér' },
];

const PROCESS = [
  { num: '1', label: 'Konzultace' },
  { num: '2', label: 'Studie' },
  { num: '3', label: 'Projekt' },
  { num: '4', label: 'Realizace' },
];

const TESTIMONIALS: AnimatedTestimonial[] = [
  {
    text: 'Studio Form navrhlo rekonstrukci tak, že jsme konečně propojili starý byt s moderním životem. Každý detail má důvod.',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    name: 'Klára Šebková',
    role: 'Privátní klientka',
  },
  {
    text: 'Komunikace byla přesná a klidná. Rozpočet, materiály i stavební dozor držely jednu linii od první skici po dokončení.',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    name: 'Tomáš Havel',
    role: 'Investor rekonstrukce',
  },
  {
    text: 'Tohle nebyl jen návrh interiéru. Byla to kurátorská práce se světlem, objemem a rytmem prostoru.',
    image: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=200&q=80',
    name: 'Lucie Bártová',
    role: 'Art director',
  },
];

export default function ArchiektClient({ site: s }: { site: ExampleSite }) {
  const [isDark, setIsDark] = useState(true);
  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };
  const palette = isDark
    ? {
        bg: s.bg,
        surface: s.surface,
        text: s.text,
        muted: s.textMuted,
        line: 'rgba(255,255,255,0.08)',
      }
    : {
        bg: '#f5f0e8',
        surface: '#fbf8f2',
        text: '#171717',
        muted: '#6b645b',
        line: 'rgba(23,23,23,0.08)',
      };

  return (
    <div style={{ background: palette.bg, minHeight: '100vh', color: palette.text, fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)', transition: 'background 0.25s ease, color 0.25s ease' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .fu{animation:fadeUp 0.9s ease both}
        .d1{animation-delay:0.1s} .d2{animation-delay:0.25s}
        .portfolio-item { position: relative; overflow: hidden; cursor: pointer; }
        .portfolio-item img { display: block; width: 100%; object-fit: cover; transition: transform 0.6s ease; filter: brightness(0.85); }
        .portfolio-item:hover img { transform: scale(1.04); filter: brightness(1); }
        .portfolio-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 24px; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); opacity: 0; transition: opacity 0.3s; }
        .portfolio-item:hover .portfolio-overlay { opacity: 1; }
        .cta-arrow { display: inline-flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 700; color: #f8fafc; text-decoration: none; letter-spacing: '1px'; transition: gap 0.2s; cursor: pointer; border: none; background: none; font-family: inherit; }
        .cta-arrow:hover { gap: 18px; }
      `}</style>

      {/* AIWEB Demo badge */}
      <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
        <Link href="/aiweb#priklady" style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 100,
          background: 'rgba(124,58,237,0.9)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(167,139,250,0.4)', color: '#fff', textDecoration: 'none',
          fontSize: 12, fontWeight: 700, boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
        }}>
          <span style={{ fontSize: 14 }}>⚡</span>
          Web od AIWEB.CZ
        </Link>
      </div>

      {/* MINIMAL FIXED NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '0 48px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: `${palette.bg}d9`, backdropFilter: 'blur(18px)', borderBottom: `1px solid ${palette.line}` }}>
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: palette.text }}>{s.name}</span>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {['Portfolio', 'Kontakt'].map(l => (
            <span key={l} style={{ fontSize: 13, color: palette.muted, cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase', transition: 'color 0.2s' }}
              onClick={() => scrollTo(l === 'Kontakt' ? 'kontakt' : 'portfolio')}
              onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.color = palette.text; }}
              onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.color = palette.muted; }}>
              {l}
            </span>
          ))}
          <ThemeToggle isDark={isDark} onToggle={() => setIsDark(v => !v)} />
        </div>
      </nav>

      {/* BRUTALIST HERO */}
      <section style={{ padding: '140px 48px 80px', minHeight: '92vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div style={{ maxWidth: 1200 }}>
          <div className="fu" style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: palette.muted, marginBottom: 18 }}>
              {s.heroLabel}
            </div>
            <GooeyText
              texts={['Prostor', 'Světlo', 'Materiál', 'Klid']}
              className="mb-6 h-[84px] md:h-[120px]"
              textClassName="font-black tracking-[-0.08em] text-[clamp(54px,10vw,132px)]"
            />
            <div style={{ fontSize: 'clamp(34px, 5vw, 58px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 0.95, color: palette.text }}>
              je médium.
            </div>
          </div>
          <div style={{ width: '100%', height: 1, background: palette.line, marginBottom: 28 }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
            <p className="fu d1" style={{ fontSize: 16, color: palette.muted, lineHeight: 1.8, maxWidth: 520, margin: 0 }}>
              {s.heroSub}
            </p>
            <GradientButton className="fu d2" onClick={() => scrollTo('kontakt')}>Zahájit projekt</GradientButton>
          </div>
        </div>
      </section>

      {/* FULL-WIDTH PHOTO STRIP */}
      <section>
        <img
          src="https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1600&q=80"
          alt="Architektura"
          style={{ width: '100%', height: 500, objectFit: 'cover', display: 'block', filter: 'brightness(0.9)' }}
        />
      </section>

      {/* PORTFOLIO GRID */}
      <section id="portfolio" style={{ padding: '100px 48px', background: palette.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-2px', margin: 0 }}>Portfolio</h2>
            <span style={{ fontSize: 13, color: palette.muted, textTransform: 'uppercase', letterSpacing: '1.5px' }}>2022 — 2025</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
            {PORTFOLIO.map((item, i) => (
              <div key={item.id} className="portfolio-item">
                <img
                  src={`https://images.unsplash.com/photo-${item.id}?auto=format&fit=crop&w=600&q=80`}
                  alt={item.name}
                  style={{ height: i === 1 ? 480 : 360 }}
                />
                <div className="portfolio-overlay">
                  <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#fff' }}>{item.name}</p>
                  <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>{item.type} · {item.year}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS - HORIZONTAL WITH OUTLINE NUMBERS */}
      <section style={{ padding: '100px 48px', background: palette.surface }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ fontWeight: 700, margin: '0 0 64px', textTransform: 'uppercase', letterSpacing: '3px', fontSize: 14, color: palette.muted }}>Proces</h2>
          <div style={{ display: 'flex', gap: 0 }}>
            {PROCESS.map((step, i) => (
              <div key={i} style={{ flex: 1, borderRight: i < PROCESS.length - 1 ? `1px solid ${palette.line}` : 'none', paddingRight: 40, paddingLeft: i > 0 ? 40 : 0 }}>
                <div style={{
                  fontSize: 'clamp(80px, 10vw, 120px)', fontWeight: 900, lineHeight: 0.9, marginBottom: 20,
                  color: 'transparent',
                  WebkitTextStroke: `1px ${isDark ? 'rgba(248,250,252,0.35)' : 'rgba(23,23,23,0.22)'}`,
                  letterSpacing: '-4px',
                }}>
                  {step.num}
                </div>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: palette.text, letterSpacing: '0.5px' }}>{step.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS / QUOTE */}
      <section style={{ padding: '120px 48px', background: palette.bg, overflow: 'hidden' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '280px minmax(0,1fr) 280px', gap: 28, alignItems: 'center' }}>
          <TestimonialsColumn testimonials={TESTIMONIALS.slice(0, 2)} duration={16} />
          <div style={{ textAlign: 'center', padding: '0 12px' }}>
            <p style={{ fontSize: 'clamp(24px, 4vw, 44px)', fontStyle: 'italic', fontWeight: 300, color: isDark ? 'rgba(248,250,252,0.5)' : 'rgba(23,23,23,0.55)', lineHeight: 1.45, margin: 0, letterSpacing: '-0.5px' }}>
              &ldquo;Dobrá architektura nevznikne bez trpělivého dialogu. Nejlepší budovy jsou ty, které přesně odráží lidi, kteří v nich žijí.&rdquo;
            </p>
            <div style={{ marginTop: 22, fontSize: 12, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', color: palette.muted }}>
              Studio Form · Reference klientů
            </div>
          </div>
          <TestimonialsColumn testimonials={TESTIMONIALS.slice(1)} duration={18} />
        </div>
      </section>

      {/* MINIMAL CTA */}
      <section id="kontakt" style={{ padding: '80px 48px', background: palette.surface, borderTop: `1px solid ${palette.line}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 32 }}>
          <div>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 60px)', fontWeight: 900, letterSpacing: '-2.5px', margin: '0 0 8px' }}>Začněme spolu.</h2>
            <p style={{ fontSize: 16, color: palette.muted, margin: 0, lineHeight: 1.7 }}>Úvodní konzultace zdarma. Přivezeme skici a inspiraci přímo k vám.</p>
          </div>
          <GradientButton onClick={() => window.open('mailto:form@studioform.cz')}>Kontaktovat studio</GradientButton>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '28px 48px', borderTop: `1px solid ${palette.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontSize: 13, color: palette.muted }}>{s.footerTagline}</span>
        <div style={{ display: 'flex', gap: 24 }}>
          {s.footerLinks.map(l => (<span key={l} style={{ fontSize: 12, color: palette.muted, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px' }}>{l}</span>))}
        </div>
      </footer>
    </div>
  );
}
