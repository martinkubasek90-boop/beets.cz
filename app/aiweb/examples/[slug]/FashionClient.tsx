'use client';

import Link from 'next/link';
import type { ExampleSite } from '../data';

const COLLECTION = [
  { id: '1469334031218-e382a71b716b', name: 'Jarní kolekce SS25', price: 'od 2 490 Kč', tall: true, w: 500, h: 700 },
  { id: '1490481651871-ab68de25d43d', name: 'Noční elegance', price: 'od 1 890 Kč', tall: false, w: 500, h: 400 },
  { id: '1445205170230-053b83016050', name: 'Urban Black', price: 'od 1 290 Kč', tall: false, w: 500, h: 400 },
];

const VALUES = [
  'Organické materiály, férové podmínky výroby',
  'Každá kolekce max. 200 kusů — žádná masová produkce',
  'Navrhujeme v Praze, vyrábíme v České republice',
  'Doprava zdarma, vrácení do 30 dní bez otázek',
];

export default function FashionClient({ site: s }: { site: ExampleSite }) {
  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };

  return (
    <div style={{ background: s.bg, minHeight: '100vh', color: s.text, fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)' }}>
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marquee-track { display: flex; animation: marquee 18s linear infinite; white-space: nowrap; }
        .collection-card { position: relative; overflow: hidden; cursor: pointer; }
        .collection-card img { display: block; width: 100%; object-fit: cover; transition: transform 0.5s ease; }
        .collection-card:hover img { transform: scale(1.04); }
        .collection-info { padding: 16px 4px; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .fu{animation:fadeUp 0.8s ease both}
        .d1{animation-delay:0.15s} .d2{animation-delay:0.3s} .d3{animation-delay:0.45s}
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

      {/* TRANSPARENT FIXED NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(5,5,5,0.6)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '4px', color: '#fff', textTransform: 'uppercase' }}>{s.name}</span>
        <div style={{ display: 'flex', gap: 32 }}>
          {s.footerLinks.map(l => (
            <span key={l} style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', cursor: 'pointer', letterSpacing: '1.5px', textTransform: 'uppercase', transition: 'color 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.color = s.primary; }}
              onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.color = 'rgba(255,255,255,0.65)'; }}>
              {l}
            </span>
          ))}
        </div>
      </nav>

      {/* FULL-SCREEN EDITORIAL HERO */}
      <section style={{ position: 'relative', height: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
        <img
          src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1400&q=80"
          alt="NOIR Hero"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
        <div style={{ position: 'relative', zIndex: 2, padding: '0 60px 80px', maxWidth: 700 }}>
          <div className="fu" style={{ fontSize: 11, color: s.primary, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 20 }}>
            {s.heroLabel}
          </div>
          <h1 className="fu d1" style={{ fontSize: 'clamp(60px, 10vw, 120px)', fontWeight: 900, fontStyle: 'italic', lineHeight: 0.9, letterSpacing: '-3px', margin: '0 0 24px', color: '#fff' }}>
            {s.heroH1.map((line, i) => (
              <span key={i} style={{ display: 'block' }}>{line}</span>
            ))}
          </h1>
          <p className="fu d2" style={{ fontSize: 17, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, margin: '0 0 36px', maxWidth: 500 }}>
            {s.heroSub}
          </p>
          <div className="fu d3" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <button
              onClick={() => scrollTo('kolekce')}
              style={{ padding: '14px 32px', borderRadius: 2, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', background: s.primary, color: '#fff', letterSpacing: '1px', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
            >
              {s.heroCta}
            </button>
            <button
              onClick={() => scrollTo('znacka')}
              style={{ padding: '14px 32px', borderRadius: 2, border: `1px solid rgba(255,255,255,0.5)`, cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', background: 'transparent', color: '#fff', letterSpacing: '1px', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#fff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.5)'; }}
            >
              {s.heroCtaSecondary}
            </button>
          </div>
        </div>
      </section>

      {/* MARQUEE STRIP */}
      <div style={{ background: '#0a0a0a', borderTop: `1px solid ${s.primary}30`, borderBottom: `1px solid ${s.primary}30`, padding: '14px 0', overflow: 'hidden' }}>
        <div className="marquee-track">
          {[...Array(8)].map((_, i) => (
            <span key={i} style={{ color: s.primary, fontSize: 15, fontWeight: 700, letterSpacing: '3px', marginRight: 32, textTransform: 'uppercase' }}>
              NOIR &nbsp; ● &nbsp; NOIR &nbsp; ● &nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* 3-COLUMN COLLECTION GRID */}
      <section id="kolekce" style={{ padding: '80px 40px', background: s.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48 }}>
            <div>
              <p style={{ color: s.primary, fontSize: 11, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 10 }}>Kolekce</p>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-2px', margin: 0 }}>SS25 — Limitovaná edice</h2>
            </div>
            <span style={{ fontSize: 12, color: s.textMuted, letterSpacing: '1px', textTransform: 'uppercase' }}>150 kusů · Předobjednávky otevřeny</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, alignItems: 'start' }}>
            {COLLECTION.map((item) => (
              <div key={item.id} className="collection-card">
                <img
                  src={`https://images.unsplash.com/photo-${item.id}?auto=format&fit=crop&w=${item.w}&q=80`}
                  alt={item.name}
                  style={{ height: item.tall ? 600 : 320 }}
                />
                <div className="collection-info">
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px', color: s.text }}>{item.name}</h3>
                  <p style={{ margin: 0, fontSize: 13, color: s.primary, fontWeight: 600 }}>{item.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BRAND MANIFESTO */}
      <section style={{ padding: '100px 40px', background: '#000', textAlign: 'center' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ fontSize: 'clamp(22px, 3.5vw, 40px)', fontStyle: 'italic', fontWeight: 300, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, margin: 0, letterSpacing: '-0.5px' }}>
            &ldquo;Móda je způsob říct světu, kdo jsi, aniž by sis musela otevřít ústa.&rdquo;
          </p>
          <div style={{ width: 48, height: 2, background: s.primary, margin: '32px auto 0' }} />
        </div>
      </section>

      {/* TWO-COLUMN: BRAND VALUES + PHOTO */}
      <section id="znacka" style={{ padding: '100px 40px', background: s.surface }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 80, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <p style={{ color: s.primary, fontSize: 11, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 16 }}>O značce</p>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-2px', margin: '0 0 40px' }}>Móda s hodnotami</h2>
            {VALUES.map((v, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'flex-start' }}>
                <span style={{ color: s.primary, fontSize: 18, marginTop: 2, flexShrink: 0 }}>✦</span>
                <p style={{ margin: 0, fontSize: 16, color: s.textMuted, lineHeight: 1.7 }}>{v}</p>
              </div>
            ))}
          </div>
          <div style={{ flex: '0 0 480px' }}>
            <img
              src="https://images.unsplash.com/photo-1483985988338-b24db7e7d540?auto=format&fit=crop&w=700&q=80"
              alt="NOIR brand"
              style={{ width: '100%', height: 560, objectFit: 'cover', display: 'block', borderRadius: 2 }}
            />
          </div>
        </div>
      </section>

      {/* DARK PINK CTA */}
      <section style={{ padding: '100px 40px', background: `${s.primary}18`, borderTop: `1px solid ${s.primary}30`, textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-2px', margin: '0 0 20px' }}>
            {s.sections[1]?.title}
          </h2>
          <p style={{ fontSize: 17, color: s.textMuted, margin: '0 0 40px', lineHeight: 1.7 }}>{s.sections[1]?.sub}</p>
          <button
            onClick={() => scrollTo('kolekce')}
            style={{ padding: '18px 48px', borderRadius: 2, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, fontFamily: 'inherit', background: s.primary, color: '#fff', letterSpacing: '1px', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
          >
            {s.sections[1]?.ctaText || s.heroCta}
          </button>
        </div>
      </section>

      {/* CONTACT */}
      <section id="kontakt" style={{ padding: '60px 40px', background: s.bg }}>
        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: s.textMuted, fontSize: 14, margin: '0 0 8px' }}>Dotazy a objednávky</p>
          <p style={{ fontSize: 16, color: s.primary, fontWeight: 600 }}>noir@noir.brand · @noir.brand</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '28px 40px', borderTop: `1px solid ${s.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: s.textMuted }}>{s.footerTagline}</span>
        <div style={{ display: 'flex', gap: 24 }}>
          {s.footerLinks.map(l => (<span key={l} style={{ fontSize: 13, color: s.textMuted, cursor: 'pointer' }}>{l}</span>))}
        </div>
      </footer>
    </div>
  );
}
