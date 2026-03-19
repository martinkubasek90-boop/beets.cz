'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { GradientButton } from '@/components/aiweb/gradient-button';
import type { ExampleSite } from '../data';

const PROPERTIES = [
  { id: '1582407947304-fd86f28f1a1f', name: 'Byt 3+kk, Praha 2', price: '8 900 000 Kč', specs: '3 pokoje · 85 m² · 2. patro', desc: 'Zrekonstruovaný byt v secesním domě na Náměstí Míru.' },
  { id: '1527030280862-64139fec5ef2', name: 'Vila, Praha 6', price: '24 500 000 Kč', specs: '6 pokojů · 240 m² · Zahrada', desc: 'Luxusní rodinná vila s výhledem, garáží a zahradou.' },
  { id: '1545324418-cc1a3fa10c00', name: 'Penthouse, Praha 1', price: '35 000 000 Kč', specs: '4 pokoje · 185 m² · Terasa', desc: 'Exkluzivní penthouse s panoramatickým výhledem na Prahu.' },
];

const STATS = [
  { val: '500+', label: 'prodaných nemovitostí' },
  { val: '98%', label: 'spokojených klientů' },
  { val: '12 let', label: 'na trhu' },
  { val: '2%', label: 'férová provize' },
];

const DISTRICTS = [
  { name: 'Praha 1', vibe: 'historické byty a investiční adresy' },
  { name: 'Praha 6', vibe: 'vily, rodiny a klidné rezidenční lokality' },
  { name: 'Karlín', vibe: 'nové byty, kanceláře a moderní městský život' },
];

export default function RealityClient({ site: s }: { site: ExampleSite }) {
  const [scrolled, setScrolled] = useState(false);
  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div style={{ background: s.bg, minHeight: '100vh', color: s.text, fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .fu{animation:fadeUp 0.8s ease both}
        .d1{animation-delay:0.1s} .d2{animation-delay:0.25s} .d3{animation-delay:0.4s}
        .prop-card { border-radius: 16px; overflow: hidden; background: #061410; border: 1px solid rgba(16,185,129,0.15); transition: all 0.3s; }
        .prop-card:hover { transform: translateY(-6px); box-shadow: 0 20px 60px rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.35); }
        .prop-card img { display: block; width: 100%; height: 260px; object-fit: cover; }
        .district-card { border-radius: 18px; overflow: hidden; border: 1px solid rgba(16,185,129,0.14); background: #061410; }
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

      {/* FIXED NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '0 40px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: scrolled ? `rgba(3,13,10,0.95)` : 'transparent', backdropFilter: scrolled ? 'blur(20px)' : 'none', borderBottom: scrolled ? `1px solid ${s.border}` : 'none', transition: 'all 0.3s' }}>
        <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px', color: s.text }}>{s.name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {s.footerLinks.map(l => (
            <span key={l} style={{ fontSize: 14, color: s.textMuted, cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.color = s.primary; }}
              onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.color = s.textMuted; }}>
              {l}
            </span>
          ))}
          <GradientButton onClick={() => scrollTo('kontakt')}>{s.heroCta}</GradientButton>
        </div>
      </nav>

      {/* FULL-HEIGHT HERO */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
        <img
          src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80"
          alt="Premium apartment"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(3,13,10,0.7)' }} />
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '120px 40px 60px' }}>
          <div className="fu" style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 100, background: `${s.primary}20`, border: `1px solid ${s.primary}40`, color: s.primary, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 28 }}>
            {s.heroLabel}
          </div>
          <h1 className="fu d1" style={{ fontSize: 'clamp(44px, 8vw, 88px)', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-3px', margin: '0 0 28px', color: '#fff' }}>
            {s.heroH1.map((line, i) => (
              <span key={i} style={{ display: 'block' }}>{line}</span>
            ))}
          </h1>
          <p className="fu d2" style={{ fontSize: 18, color: 'rgba(255,255,255,0.75)', lineHeight: 1.75, maxWidth: 560, margin: '0 auto 48px' }}>
            {s.heroSub}
          </p>
          {/* SEARCH BOX */}
          <div className="fu d3" style={{ display: 'inline-flex', alignItems: 'center', gap: 0, background: 'rgba(3,13,10,0.9)', border: `1px solid ${s.primary}40`, borderRadius: 12, overflow: 'hidden', backdropFilter: 'blur(20px)' }}>
            <div style={{ padding: '16px 20px', borderRight: `1px solid ${s.primary}20`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: s.textMuted }}>Hledám:</span>
              <span style={{ fontSize: 13, color: s.text, fontWeight: 600 }}>Koupit ▾</span>
            </div>
            <div style={{ padding: '16px 20px', borderRight: `1px solid ${s.primary}20` }}>
              <span style={{ fontSize: 13, color: s.text, fontWeight: 600 }}>Typ nemovitosti ▾</span>
            </div>
            <div style={{ padding: '16px 20px', borderRight: `1px solid ${s.primary}20` }}>
              <span style={{ fontSize: 13, color: s.text, fontWeight: 600 }}>Praha ▾</span>
            </div>
            <button
              onClick={() => scrollTo('nabidka')}
              style={{ padding: '16px 24px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: s.primary, color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              → Hledat
            </button>
          </div>
        </div>
      </section>

      {/* EMERALD STATS STRIP */}
      <section style={{ background: s.surface, borderTop: `1px solid ${s.border}`, borderBottom: `1px solid ${s.border}`, padding: '40px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 24 }}>
          {STATS.map((stat, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-2px', color: s.primary, lineHeight: 1 }}>{stat.val}</div>
              <div style={{ fontSize: 13, color: s.textMuted, marginTop: 6, letterSpacing: '0.5px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PROPERTY SHOWCASE */}
      <section id="nabidka" style={{ padding: '100px 40px', background: s.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ color: s.primary, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Aktuální nabídka</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 900, letterSpacing: '-2px', margin: 0 }}>Vybrané nemovitosti</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {PROPERTIES.map((prop) => (
              <div key={prop.id} className="prop-card">
                <img
                  src={`https://images.unsplash.com/photo-${prop.id}?auto=format&fit=crop&w=600&q=80`}
                  alt={prop.name}
                />
                <div style={{ padding: '24px' }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: s.primary, letterSpacing: '-1px', marginBottom: 8 }}>{prop.price}</div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 8px', color: s.text }}>{prop.name}</h3>
                  <p style={{ fontSize: 13, color: s.primary, margin: '0 0 12px', fontWeight: 600 }}>{prop.specs}</p>
                  <p style={{ fontSize: 14, color: s.textMuted, lineHeight: 1.65, margin: '0 0 20px' }}>{prop.desc}</p>
                  <button
                    onClick={() => scrollTo('kontakt')}
                    style={{ width: '100%', padding: '12px', borderRadius: 8, border: `1px solid ${s.primary}`, cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', background: 'transparent', color: s.primary, transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${s.primary}14`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    Zjistit více
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DISTRICTS / CITY GUIDE */}
      <section style={{ padding: '100px 40px', background: s.surface }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap', marginBottom: 42 }}>
            <div>
              <p style={{ color: s.primary, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Pražské lokality</p>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-1.5px', margin: 0 }}>Kde jsme nejsilnější</h2>
            </div>
            <p style={{ maxWidth: 420, margin: 0, fontSize: 15, lineHeight: 1.7, color: s.textMuted }}>
              Klienti u nás nehledají jen metr čtvereční. Potřebují pochopit lokalitu, komunitu i potenciál ceny v čase.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 18 }}>
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, minHeight: 420 }}>
              <img src="https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=1200&q=80" alt="Praha panorama" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(3,13,10,0.92), rgba(3,13,10,0.08))' }} />
              <div style={{ position: 'absolute', left: 24, right: 24, bottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: s.primary, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>Local market insight</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 8 }}>Doporučení podle životního stylu, ne jen ceny</div>
                <div style={{ fontSize: 15, lineHeight: 1.7, color: 'rgba(255,255,255,0.72)' }}>Propojujeme nabídku s reálným kontextem. Školy, doprava, investiční potenciál i charakter čtvrti.</div>
              </div>
            </div>
            {DISTRICTS.map((district, index) => (
              <div key={district.name} className="district-card">
                <img
                  src={`https://images.unsplash.com/${index === 0 ? 'photo-1500530855697-b586d89ba3ee' : index === 1 ? 'photo-1494526585095-c41746248156' : 'photo-1460317442991-0ec209397118'}?auto=format&fit=crop&w=900&q=80`}
                  alt={district.name}
                  style={{ width: '100%', height: 250, objectFit: 'cover', display: 'block' }}
                />
                <div style={{ padding: 20 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.text, marginBottom: 6 }}>{district.name}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, color: s.textMuted }}>{district.vibe}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AGENT SECTION */}
      <section style={{ padding: '100px 40px', background: s.surface }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 80, alignItems: 'center' }}>
          {/* Left: Agent profile */}
          <div style={{ flex: '0 0 300px', textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 24 }}>
              <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `2px solid ${s.primary}`, opacity: 0.5 }} />
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80"
                alt="Jana Nováčková"
                style={{ width: 160, height: 160, borderRadius: '50%', objectFit: 'cover', display: 'block', margin: '0 auto' }}
              />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px' }}>Jana Nováčková</h3>
            <p style={{ fontSize: 13, color: s.primary, fontWeight: 600, margin: '0 0 4px' }}>Senior makléř</p>
            <p style={{ fontSize: 13, color: s.textMuted, margin: 0 }}>8 let zkušeností</p>
            <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => scrollTo('kontakt')}
                style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${s.primary}`, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', background: 'transparent', color: s.primary }}
              >
                Napsat
              </button>
              <button
                onClick={() => window.open('tel:+420800123456')}
                style={{ padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', background: s.primary, color: '#fff' }}
              >
                Zavolat
              </button>
            </div>
          </div>
          {/* Right: Agency text */}
          <div style={{ flex: 1 }}>
            <p style={{ color: s.primary, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 16 }}>O nás</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-1.5px', margin: '0 0 20px' }}>Nemovitosti bez starostí</h2>
            <p style={{ fontSize: 16, color: s.textMuted, lineHeight: 1.8, marginBottom: 16 }}>
              PRAGA Reality je prémiová realitní kancelář specializující se na rezidenční a komerční nemovitosti v Praze. Máme 12 let zkušeností a více než 500 úspěšně uzavřených transakcí.
            </p>
            <p style={{ fontSize: 16, color: s.textMuted, lineHeight: 1.8, margin: 0 }}>
              Každá transakce zahrnuje kompletní právní servis. Férová provize 2 %, žádné skryté poplatky.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="kontakt" style={{ padding: '100px 40px', textAlign: 'center', background: s.bg }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <p style={{ color: s.primary, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 16 }}>Kontakt</p>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-2px', margin: '0 0 20px' }}>
            {s.sections[1]?.title}
          </h2>
          <p style={{ fontSize: 16, color: s.textMuted, margin: '0 0 40px', lineHeight: 1.7 }}>{s.sections[1]?.sub}</p>
          <GradientButton onClick={() => window.open('tel:+420800123456')}>
            {s.sections[1]?.ctaText || s.heroCta}
          </GradientButton>
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
