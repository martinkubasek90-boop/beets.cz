'use client';

import Link from 'next/link';
import type { ExampleSite } from '../data';

const GALLERY_SECTIONS = [
  {
    label: 'Svatební',
    photos: ['1531746020798-e6953c6e8e04', '1519741497674-611481863552', '1469334031218-e382a71b716b'],
  },
  {
    label: 'Portréty',
    photos: ['1507003211169-0a1dd7228f2d', '1554080353-a576cf803bda', '1469334031218-e382a71b716b'],
  },
  {
    label: 'Komerční',
    photos: ['1516035069371-29a1b244cc32', '1477959858617-67f85cf4f1df', '1506905925346-21bda4d32df4'],
  },
];

const PRICING_TIERS = [
  {
    name: 'Portréty',
    price: '2 500 Kč',
    includes: ['2 hodiny focení', '30 upravených snímků', 'Online galerie', 'Tisk 20×30 cm'],
  },
  {
    name: 'Rodinné focení',
    price: '3 900 Kč',
    includes: ['3 hodiny focení', '60 upravených snímků', 'Online galerie', 'USB se surovými soubory'],
  },
  {
    name: 'Svatba (celý den)',
    price: 'od 18 000 Kč',
    includes: ['8+ hodin focení', '400+ upravených snímků', 'Online galerie', 'Fotoalbum na míru'],
  },
];

export default function FotografClient({ site: s }: { site: ExampleSite }) {
  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };

  return (
    <div style={{ background: s.bg, minHeight: '100vh', color: s.text, fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .fu{animation:fadeUp 0.8s ease both}
        .d1{animation-delay:0.1s} .d2{animation-delay:0.25s}
        .gallery-photo { overflow: hidden; cursor: pointer; }
        .gallery-photo img { display: block; width: 100%; height: 250px; object-fit: cover; transition: transform 0.5s ease; filter: brightness(0.9); }
        .gallery-photo:hover img { transform: scale(1.04); filter: brightness(1); }
        .pricing-row { display: flex; align-items: flex-start; gap: 32px; padding: 36px 0; border-bottom: 1px solid rgba(148,163,184,0.1); }
        .pricing-row:last-child { border-bottom: none; }
        .nav-link { font-size: 12px; color: rgba(248,250,252,0.5); cursor: pointer; letter-spacing: 1.5px; text-transform: uppercase; transition: color 0.2s; }
        .nav-link:hover { color: #f8fafc; }
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

      {/* FIXED TRANSPARENT MINIMAL NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '0 48px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(6,6,6,0.8)', backdropFilter: 'blur(20px)' }}>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '1px', color: s.text }}>{s.name}</span>
        <div style={{ display: 'flex', gap: 36 }}>
          {['Portfolio', 'Ceny', 'Kontakt'].map(l => (
            <span key={l} className="nav-link" onClick={() => scrollTo(l === 'Portfolio' ? 'portfolio' : l === 'Ceny' ? 'ceny' : 'kontakt')}>
              {l}
            </span>
          ))}
        </div>
      </nav>

      {/* MASONRY-INSPIRED HERO GRID */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, minHeight: '100vh', paddingTop: 60 }}>
        {/* Col 1: tall + small */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="gallery-photo">
            <img
              src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=600&q=80"
              alt="Wedding"
              style={{ height: 500 }}
            />
          </div>
          <div className="gallery-photo">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80"
              alt="Portrait"
              style={{ height: 250 }}
            />
          </div>
        </div>
        {/* Col 2: medium + medium */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="gallery-photo">
            <img
              src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=600&q=80"
              alt="Landscape"
              style={{ height: 350 }}
            />
          </div>
          <div className="gallery-photo">
            <img
              src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=600&q=80"
              alt="Urban"
              style={{ height: 400 }}
            />
          </div>
        </div>
        {/* Col 3: text box + small photo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ background: '#060606', height: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 36px' }}>
            <div className="fu" style={{ fontSize: 11, color: s.primary, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 20 }}>
              {s.heroLabel.split('·')[0]?.trim()}
            </div>
            <h1 className="fu d1" style={{ fontSize: 'clamp(28px, 3.5vw, 46px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.05, margin: '0 0 16px', color: s.text }}>
              {s.heroH1.map((line, i) => (
                <span key={i} style={{ display: 'block' }}>{line}</span>
              ))}
            </h1>
            <p className="fu d2" style={{ fontSize: 14, color: s.textMuted, lineHeight: 1.7, margin: '0 0 24px' }}>
              {s.heroSub}
            </p>
            <button
              onClick={() => scrollTo('kontakt')}
              style={{ alignSelf: 'flex-start', padding: '10px 22px', borderRadius: 6, border: `1px solid ${s.primary}50`, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', background: 'transparent', color: s.primary, transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${s.primary}14`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              {s.heroCta}
            </button>
          </div>
          <div className="gallery-photo">
            <img
              src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80"
              alt="Wedding 2"
              style={{ height: 450 }}
            />
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section style={{ padding: '100px 48px', background: s.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 80, alignItems: 'center' }}>
          <div style={{ flex: '0 0 380px' }}>
            <img
              src="https://images.unsplash.com/photo-1554080353-a576cf803bda?auto=format&fit=crop&w=500&q=80"
              alt="Tomáš Dvořák"
              style={{ width: '100%', height: 460, objectFit: 'cover', display: 'block', borderRadius: 200 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: s.primary, fontSize: 11, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 20 }}>O mně</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-1.5px', margin: '0 0 24px' }}>Fotím proto,<br />že věřím v okamžiky.</h2>
            <p style={{ fontSize: 16, color: s.textMuted, lineHeight: 1.85, marginBottom: 16, fontStyle: 'italic' }}>
              &ldquo;Nejlepší fotografie nejsou nikdy naplánované. Jsou to okamžiky, které se prostě staly.&rdquo;
            </p>
            <div style={{ width: 40, height: 1, background: `${s.primary}60`, margin: '24px 0' }} />
            <p style={{ fontSize: 16, color: s.textMuted, lineHeight: 1.85, margin: 0 }}>
              Fotografuji od roku 2016. Začínal jsem s reportážní fotografií, dnes se specializuji na svatební a portrétní focení po celé České republice.
            </p>
            <p style={{ fontSize: 14, color: s.primary, fontWeight: 700, marginTop: 20, letterSpacing: '1px' }}>
              Tomáš Dvořák · 8 let praxe · Praha & celá ČR
            </p>
          </div>
        </div>
      </section>

      {/* GALLERY SECTIONS */}
      <section id="portfolio" style={{ padding: '80px 48px 100px', background: '#0a0a0a' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {GALLERY_SECTIONS.map((section, si) => (
            <div key={si} style={{ marginBottom: 72 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: s.primary, marginBottom: 20 }}>
                {section.label}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                {section.photos.map((id, pi) => (
                  <div key={pi} className="gallery-photo">
                    <img
                      src={`https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=500&q=80`}
                      alt={section.label}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING - MINIMAL LIST */}
      <section id="ceny" style={{ padding: '100px 48px', background: s.bg }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ marginBottom: 60 }}>
            <p style={{ color: s.primary, fontSize: 11, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 16 }}>Ceník</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-1.5px', margin: 0 }}>Transparentní ceny</h2>
          </div>
          {PRICING_TIERS.map((tier, i) => (
            <div key={i} className="pricing-row">
              <div style={{ flex: '0 0 240px' }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px', color: s.text }}>{tier.name}</h3>
                <div style={{ fontSize: 28, fontWeight: 900, color: s.primary, letterSpacing: '-1px' }}>{tier.price}</div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 10, paddingTop: 4 }}>
                {tier.includes.map((inc, ii) => (
                  <span key={ii} style={{ fontSize: 13, color: s.textMuted, display: 'flex', alignItems: 'center', gap: 6, minWidth: '45%' }}>
                    <span style={{ color: s.primary, fontSize: 10 }}>✓</span> {inc}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MINIMAL CTA */}
      <section id="kontakt" style={{ padding: '100px 48px', background: '#0a0a0a', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <p style={{ fontSize: 'clamp(20px, 3vw, 36px)', fontWeight: 300, color: 'rgba(248,250,252,0.6)', margin: '0 0 16px', fontStyle: 'italic' }}>
            Zbývají 4 termíny pro rok 2026.
          </p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 900, letterSpacing: '-2px', margin: '0 0 36px', color: s.text }}>
            Pojďme se potkat.
          </h2>
          <a
            href="mailto:tomas@dvorakfoto.cz"
            style={{ display: 'inline-block', padding: '16px 40px', borderRadius: 8, border: `1px solid ${s.primary}50`, fontSize: 15, fontWeight: 700, color: s.primary, textDecoration: 'none', transition: 'all 0.2s', background: 'transparent' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = `${s.primary}12`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
          >
            tomas@dvorakfoto.cz
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '28px 48px', borderTop: `1px solid ${s.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: s.textMuted }}>{s.footerTagline}</span>
        <div style={{ display: 'flex', gap: 24 }}>
          {s.footerLinks.map(l => (<span key={l} style={{ fontSize: 13, color: s.textMuted, cursor: 'pointer' }}>{l}</span>))}
        </div>
      </footer>
    </div>
  );
}
