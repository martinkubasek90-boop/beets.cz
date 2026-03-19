'use client';

import Link from 'next/link';
import { BackgroundGradientAnimation } from '@/components/ui/background-gradient-animation';
import type { ExampleSite } from '../data';

export default function ZubarClient({ site: s }: { site: ExampleSite }) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const btn = (text: string, primary = true) => (
    <button
      onClick={() => scrollTo('kontakt')}
      style={{
        padding: '14px 28px', borderRadius: 8,
        border: primary ? 'none' : `1px solid ${s.primary}`,
        cursor: 'pointer', fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
        background: primary ? s.primary : 'transparent',
        color: primary ? '#fff' : s.primary,
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
    >
      {text}
    </button>
  );

  return (
    <div style={{ background: s.bg, minHeight: '100vh', color: s.text, fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .fu{animation:fadeUp 0.7s ease both}
        .d1{animation-delay:0.1s} .d2{animation-delay:0.22s} .d3{animation-delay:0.34s}
        .card-ex { transition:all 0.25s; }
        .card-ex:hover { transform:translateY(-3px); }
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

      {/* HERO – BackgroundGradientAnimation */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <BackgroundGradientAnimation
          gradientBackgroundStart="rgb(240, 248, 255)"
          gradientBackgroundEnd="rgb(219, 234, 254)"
          firstColor="37, 99, 235"
          secondColor="59, 130, 246"
          thirdColor="147, 197, 253"
          fourthColor="96, 165, 250"
          fifthColor="191, 219, 254"
          pointerColor="37, 99, 235"
          containerClassName="!h-screen !w-full !relative"
        >
          {/* NAV inside gradient */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(248,250,252,0.8)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${s.border}` }}>
            <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px', color: s.text }}>{s.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              {s.footerLinks.map(l => (
                <span key={l} style={{ fontSize: 14, color: s.textMuted, cursor: 'pointer' }}>{l}</span>
              ))}
              {btn(s.heroCta)}
            </div>
          </div>

          {/* Hero text */}
          <div className="absolute z-50 inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
            <div className="fu" style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 100, background: `${s.primary}20`, border: `1px solid ${s.primary}40`, color: s.primary, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 28 }}>
              {s.heroLabel}
            </div>
            <h1 className="fu d1" style={{ fontSize: 'clamp(44px, 9vw, 96px)', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-3px', margin: '0 0 28px', color: s.text }}>
              {s.heroH1.map((line, i) => (
                <span key={i} style={{ display: 'block', color: i === s.heroH1.length - 1 ? s.primary : s.text }}>
                  {line}
                </span>
              ))}
            </h1>
            <p className="fu d2" style={{ fontSize: 'clamp(16px, 2vw, 19px)', color: s.textMuted, lineHeight: 1.75, maxWidth: 580, margin: '0 auto 40px' }}>
              {s.heroSub}
            </p>
            <div className="fu d3 pointer-events-auto" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              {btn(s.heroCta, true)}
              {btn(s.heroCtaSecondary, false)}
            </div>
          </div>
        </BackgroundGradientAnimation>
      </section>

      {/* SECTIONS */}
      {s.sections.map((sec, si) => (
        <section key={si} style={{ padding: '80px 24px', background: si % 2 === 0 ? s.surface : s.bg }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            {sec.type === 'cta' ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', borderRadius: 20, background: `${s.primary}12`, border: `1px solid ${s.primary}30` }}>
                <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 900, letterSpacing: '-1px', margin: '0 0 12px' }}>{sec.title}</h2>
                {sec.sub && <p style={{ color: s.textMuted, fontSize: 16, margin: '0 0 32px', maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>{sec.sub}</p>}
                {btn(sec.ctaText || s.heroCta)}
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: 52 }}>
                  {sec.label && <p style={{ color: s.primary, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10 }}>{sec.label}</p>}
                  <h2 style={{ fontSize: 'clamp(24px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>{sec.title}</h2>
                  {sec.sub && <p style={{ color: s.textMuted, fontSize: 16, margin: '12px 0 0' }}>{sec.sub}</p>}
                </div>
                {sec.items && (
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${sec.items.length <= 3 ? '220px' : '240px'}, 1fr))`, gap: 20 }}>
                    {sec.items.map((item, ii) => (
                      <div key={ii} className="card-ex" style={{ padding: '24px', borderRadius: 14, background: `${s.primary}08`, border: `1px solid ${s.border}` }}>
                        <div style={{ fontSize: 28, marginBottom: 14 }}>{item.icon}</div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: s.text }}>{item.title}</h3>
                        <p style={{ fontSize: 14, color: s.textMuted, lineHeight: 1.65, margin: 0 }}>{item.desc}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      ))}

      {/* CONTACT */}
      <section id="kontakt" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <p style={{ color: s.primary, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Kontakt</p>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 900, letterSpacing: '-1px', margin: '0 0 16px' }}>Pojďme spolupracovat</h2>
          <p style={{ color: s.textMuted, fontSize: 16, marginBottom: 36, lineHeight: 1.7 }}>Ozvěte se nám. Rádi odpovíme na vaše otázky a připravíme nezávaznou nabídku.</p>
          {btn(s.heroCta)}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '28px 24px', borderTop: `1px solid ${s.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, maxWidth: 1100, margin: '0 auto' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: s.textMuted }}>{s.footerTagline}</span>
        <div style={{ display: 'flex', gap: 20 }}>
          {s.footerLinks.map(l => (
            <span key={l} style={{ fontSize: 13, color: s.textMuted, cursor: 'pointer' }}>{l}</span>
          ))}
        </div>
      </footer>
    </div>
  );
}
