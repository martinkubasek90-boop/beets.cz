'use client';

import Link from 'next/link';
import type { ExampleSite } from '../data';

const STEPS = [
  { num: '01', title: 'Online objednávka', desc: 'Vyberte si termín online nebo zavolejte. Volné termíny do 48 hodin.' },
  { num: '02', title: 'Uvítání a konzultace', desc: 'Přivítáme vás a probereme vaše potřeby. Žádný spěch, žádný stres.' },
  { num: '03', title: 'Ošetření', desc: 'Moderní přístroje, šetrné metody. Bezbolestná péče je naší prioritou.' },
  { num: '04', title: 'Péče po ošetření', desc: 'Dostanete jasné pokyny pro domácí péči a termín kontroly.' },
];

export default function ZubarClient({ site: s }: { site: ExampleSite }) {
  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };

  return (
    <div style={{ background: s.bg, minHeight: '100vh', color: s.text, fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .fu { animation: fadeUp 0.7s ease both; }
        .d1 { animation-delay: 0.1s; } .d2 { animation-delay: 0.22s; } .d3 { animation-delay: 0.34s; }
        .service-card { background: #fff; border: 1px solid rgba(37,99,235,0.12); border-left: 4px solid #2563eb; border-radius: 10px; padding: 24px 28px; transition: all 0.25s; }
        .service-card:hover { box-shadow: 0 8px 32px rgba(37,99,235,0.12); transform: translateY(-2px); }
        .step-card { background: #fff; border-radius: 16px; padding: 32px 28px; box-shadow: 0 2px 16px rgba(0,0,0,0.06); flex: 1; }
        .nav-link { font-size: 14px; font-weight: 600; color: #64748b; cursor: pointer; transition: color 0.2s; }
        .nav-link:hover { color: #2563eb; }
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

      {/* STICKY WHITE NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, padding: '0 40px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', boxShadow: '0 1px 12px rgba(0,0,0,0.08)', borderBottom: '1px solid rgba(37,99,235,0.08)' }}>
        <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', color: s.primary }}>{s.name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {s.footerLinks.map(l => (
            <span key={l} className="nav-link">{l}</span>
          ))}
          <button
            onClick={() => scrollTo('kontakt')}
            style={{ padding: '10px 22px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', background: s.primary, color: '#fff', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
          >
            {s.heroCta}
          </button>
        </div>
      </nav>

      {/* SPLIT HERO */}
      <section style={{ display: 'flex', minHeight: '88vh', background: '#f8fafc' }}>
        {/* Left: text */}
        <div style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 64px' }}>
          <div className="fu" style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 100, background: `${s.primary}12`, border: `1px solid ${s.primary}30`, color: s.primary, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 28, alignSelf: 'flex-start' }}>
            {s.heroLabel}
          </div>
          <h1 className="fu d1" style={{ fontSize: 'clamp(44px, 6vw, 76px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-2.5px', margin: '0 0 24px', color: '#0f172a' }}>
            {s.heroH1.map((line, i) => (
              <span key={i} style={{ display: 'block' }}>{line}</span>
            ))}
          </h1>
          <p className="fu d2" style={{ fontSize: 18, color: s.textMuted, lineHeight: 1.75, maxWidth: 460, margin: '0 0 40px' }}>
            {s.heroSub}
          </p>
          <div className="fu d3" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <button
              onClick={() => scrollTo('kontakt')}
              style={{ padding: '16px 32px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', background: s.primary, color: '#fff', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
            >
              {s.heroCta}
            </button>
            <button
              onClick={() => scrollTo('sluzby')}
              style={{ padding: '16px 32px', borderRadius: 10, border: `2px solid ${s.primary}`, cursor: 'pointer', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', background: '#fff', color: s.primary, transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${s.primary}10`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
            >
              {s.heroCtaSecondary}
            </button>
          </div>
        </div>
        {/* Right: patient photo */}
        <div style={{ flex: '0 0 45%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 40px', background: '#fff' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: -10, borderRadius: 26, border: `3px solid ${s.primary}`, opacity: 0.3 }} />
            <img
              src="https://images.unsplash.com/photo-1588776814546-1ffbb5c098d5?auto=format&fit=crop&w=600&q=80"
              alt="Spokojený pacient"
              style={{ width: 420, height: 520, objectFit: 'cover', borderRadius: 20, display: 'block', boxShadow: '0 20px 60px rgba(37,99,235,0.15)' }}
            />
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <div style={{ background: s.primary, padding: '18px 40px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '0.5px' }}>
          ✓ Přijímáme VZP &nbsp;·&nbsp; ✓ Přijímáme ČPZP &nbsp;·&nbsp; ✓ Přijímáme OZP &nbsp;·&nbsp; ✓ Bez čekání
        </p>
      </div>

      {/* PROCESS STEPS */}
      <section style={{ padding: '100px 40px', background: '#f0f6ff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ color: s.primary, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Jak to funguje</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-1.5px', margin: 0, color: '#0f172a' }}>Čtyři kroky ke krásnému úsměvu</h2>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {STEPS.map((step) => (
              <div key={step.num} className="step-card">
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: s.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, marginBottom: 20 }}>
                  {step.num}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 10px', color: '#0f172a' }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: s.textMuted, lineHeight: 1.7, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES GRID */}
      <section id="sluzby" style={{ padding: '100px 40px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ color: s.primary, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Ošetření</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-1.5px', margin: 0, color: '#0f172a' }}>Komplexní péče o váš chrup</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
            {s.sections[0]?.items?.map((item, i) => (
              <div key={i} className="service-card">
                <div style={{ fontSize: 26, marginBottom: 12 }}>{item.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 8px', color: '#0f172a' }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: s.textMuted, lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BLUE CTA SECTION */}
      <section style={{ padding: '100px 40px', background: s.primary }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-2px', margin: '0 0 20px', color: '#fff' }}>
            {s.sections[1]?.title}
          </h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.8)', margin: '0 0 40px', lineHeight: 1.7 }}>
            {s.sections[1]?.sub}
          </p>
          <button
            onClick={() => scrollTo('kontakt')}
            style={{ padding: '18px 44px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 17, fontWeight: 800, fontFamily: 'inherit', background: '#fff', color: s.primary, transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
          >
            {s.sections[1]?.ctaText || s.heroCta}
          </button>
        </div>
      </section>

      {/* CONTACT */}
      <section id="kontakt" style={{ padding: '80px 40px', background: '#fff' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: s.primary, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Kontakt</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-1px', margin: '0 0 16px', color: '#0f172a' }}>Objednejte se online</h2>
          <p style={{ color: s.textMuted, fontSize: 16, marginBottom: 10, lineHeight: 1.7 }}>Volné termíny do 48 hodin. Přijímáme všechny pojišťovny.</p>
          <p style={{ color: s.textMuted, fontSize: 15, marginBottom: 36 }}>📞 +420 222 333 444 · 📍 Jugoslávských partyzánů 10, Praha 6</p>
          <button
            onClick={() => window.open('tel:+420222333444')}
            style={{ padding: '16px 36px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, fontFamily: 'inherit', background: s.primary, color: '#fff' }}
          >
            Zavolat a objednat se
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '28px 40px', borderTop: '1px solid rgba(37,99,235,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, background: '#f8fafc' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: s.textMuted }}>{s.footerTagline}</span>
        <div style={{ display: 'flex', gap: 20 }}>
          {s.footerLinks.map(l => (<span key={l} style={{ fontSize: 13, color: s.textMuted, cursor: 'pointer' }}>{l}</span>))}
        </div>
      </footer>
    </div>
  );
}
