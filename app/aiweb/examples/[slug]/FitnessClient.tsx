'use client';

import Link from 'next/link';
import type { ExampleSite } from '../data';

const CLASSES = [
  { name: 'HIIT Attack', schedule: 'Po, St, Pá', time: '07:00', duration: '45 min' },
  { name: 'Power Yoga', schedule: 'Út, Čt', time: '18:30', duration: '60 min' },
  { name: 'CrossFit Open', schedule: 'Po–So', time: '06:00', duration: '55 min' },
  { name: 'Box & Kick', schedule: 'Út, Čt, So', time: '19:00', duration: '60 min' },
  { name: 'Pilates Core', schedule: 'St, Pá', time: '09:00', duration: '50 min' },
  { name: 'TRX Suspension', schedule: 'Po, Čt', time: '17:30', duration: '40 min' },
];

const PRICING = [
  { name: 'Základní', price: '590 Kč', period: '/ měsíc', desc: 'Neomezený přístup do fitness · Bez závazků', highlight: false },
  { name: 'Pro', price: '990 Kč', period: '/ měsíc', desc: 'Fitness + skupinové lekce · Rezervace online', highlight: true },
  { name: 'Elite', price: '1 690 Kč', period: '/ měsíc', desc: 'Vše + osobní trenér · Výživový plán · Priorita', highlight: false },
];

const STATS = [
  { val: '400m²', label: 'vybavení' },
  { val: '8', label: 'trenérů' },
  { val: '40+', label: 'lekcí/týden' },
  { val: '2400+', label: 'členů' },
];

const TRAINERS = [
  {
    name: 'Marek Vávra',
    role: 'Strength coach',
    image: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?auto=format&fit=crop&w=700&q=80',
  },
  {
    name: 'Adéla Prokopová',
    role: 'Yoga & mobility',
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=700&q=80',
  },
  {
    name: 'David Rejzek',
    role: 'Conditioning',
    image: 'https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?auto=format&fit=crop&w=700&q=80',
  },
];

export default function FitnessClient({ site: s }: { site: ExampleSite }) {
  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };

  return (
    <div style={{ background: s.bg, minHeight: '100vh', color: s.text, fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        .fu{animation:fadeUp 0.8s ease both}
        .d1{animation-delay:0.1s} .d2{animation-delay:0.25s} .d3{animation-delay:0.4s}
        .class-card { background: #111; border: 1px solid rgba(239,68,68,0.2); border-left: 4px solid #ef4444; border-radius: 10px; padding: 20px 24px; transition: all 0.25s; }
        .class-card:hover { background: rgba(239,68,68,0.07); transform: translateX(4px); }
        .pricing-card { border-radius: 16px; padding: 40px 32px; transition: all 0.25s; }
        .pricing-card:hover:not(.pricing-highlight) { transform: translateY(-4px); }
        .trainer-card img { width: 100%; height: 280px; object-fit: cover; display: block; }
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

      {/* FIXED DARK NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(239,68,68,0.15)' }}>
        <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', color: '#fff' }}>{s.name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {s.footerLinks.map(l => (
            <span key={l} style={{ fontSize: 14, color: s.textMuted, cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.color = '#fff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.color = s.textMuted; }}>
              {l}
            </span>
          ))}
          <button
            onClick={() => scrollTo('kontakt')}
            style={{ padding: '10px 22px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', background: s.primary, color: '#fff', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
          >
            {s.heroCta}
          </button>
        </div>
      </nav>

      {/* FULL-SCREEN HERO */}
      <section style={{ position: 'relative', height: '100vh', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=80"
          alt="FitZone gym"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,8,8,0.95) 0%, rgba(8,8,8,0.4) 50%, rgba(8,8,8,0.1) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, rgba(239,68,68,0.15) 0%, transparent 60%)` }} />
        <div style={{ position: 'relative', zIndex: 2, padding: '0 60px 80px', maxWidth: 700 }}>
          <div className="fu" style={{ fontSize: 12, color: s.primary, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 20 }}>
            {s.heroLabel}
          </div>
          <h1 className="fu d1" style={{ fontSize: 'clamp(56px, 10vw, 120px)', fontWeight: 900, lineHeight: 0.9, letterSpacing: '-3px', margin: '0 0 24px', color: '#fff', textTransform: 'uppercase' }}>
            {s.heroH1.map((line, i) => (
              <span key={i} style={{ display: 'block' }}>{line}</span>
            ))}
          </h1>
          <p className="fu d2" style={{ fontSize: 18, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, margin: '0 0 36px', maxWidth: 500 }}>
            {s.heroSub}
          </p>
          <div className="fu d3" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <button
              onClick={() => scrollTo('kontakt')}
              style={{ padding: '16px 36px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 800, fontFamily: 'inherit', background: s.primary, color: '#fff', letterSpacing: '0.5px', textTransform: 'uppercase', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
            >
              {s.heroCta}
            </button>
            <button
              onClick={() => scrollTo('lekce')}
              style={{ padding: '16px 36px', borderRadius: 4, border: '2px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16, fontWeight: 800, fontFamily: 'inherit', background: 'transparent', color: '#fff', letterSpacing: '0.5px', textTransform: 'uppercase', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#fff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.4)'; }}
            >
              {s.heroCtaSecondary}
            </button>
          </div>
        </div>
      </section>

      {/* RED STATS BANNER */}
      <section style={{ background: s.primary, padding: '32px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 24 }}>
          {STATS.map((stat, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-2px', color: '#fff', lineHeight: 1 }}>{stat.val}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CLASSES GRID */}
      <section id="lekce" style={{ padding: '100px 40px', background: s.bg }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 52 }}>
            <p style={{ color: s.primary, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Skupinové lekce</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 900, letterSpacing: '-2px', margin: 0, textTransform: 'uppercase' }}>Rozvrh lekcí</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {CLASSES.map((cls, i) => (
              <div key={i} className="class-card">
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cls.name}</h3>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: s.textMuted }}>
                  <span>📅 {cls.schedule}</span>
                  <span>🕐 {cls.time}</span>
                  <span>⏱ {cls.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRAINERS */}
      <section style={{ padding: '100px 40px', background: '#0b0b0b', borderTop: '1px solid rgba(239,68,68,0.12)', borderBottom: '1px solid rgba(239,68,68,0.12)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap', marginBottom: 44 }}>
            <div>
              <p style={{ color: s.primary, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10 }}>Trenéři</p>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 900, letterSpacing: '-2px', margin: 0, textTransform: 'uppercase' }}>Lidi, co tě potáhnou dopředu</h2>
            </div>
            <p style={{ maxWidth: 420, margin: 0, fontSize: 15, lineHeight: 1.7, color: s.textMuted }}>
              Každý trenér má vlastní specializaci. Neprodáváme členství, ale jasný progres a strukturu.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 18 }}>
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, minHeight: 420 }}>
              <img src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80" alt="Trénink ve FitZone" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,8,8,0.92), rgba(8,8,8,0.15))' }} />
              <div style={{ position: 'absolute', left: 24, right: 24, bottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: s.primary, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10 }}>Coaching floor</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 8 }}>Denně desítky vedených tréninků</div>
                <div style={{ fontSize: 15, lineHeight: 1.7, color: 'rgba(255,255,255,0.72)' }}>Od ranní mobility až po večerní conditioning. Vždy s koučem na place.</div>
              </div>
            </div>
            {TRAINERS.map((trainer) => (
              <div key={trainer.name} className="trainer-card" style={{ borderRadius: 18, overflow: 'hidden', background: '#111', border: '1px solid rgba(239,68,68,0.16)' }}>
                <img src={trainer.image} alt={trainer.name} />
                <div style={{ padding: 18 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{trainer.name}</div>
                  <div style={{ fontSize: 13, color: s.primary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{trainer.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: '100px 40px', background: s.surface }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ color: s.primary, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Ceník</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 900, letterSpacing: '-2px', margin: 0, textTransform: 'uppercase' }}>Vyber svůj plán</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {PRICING.map((plan) => (
              <div key={plan.name} className={`pricing-card${plan.highlight ? ' pricing-highlight' : ''}`} style={{
                background: plan.highlight ? s.primary : '#111',
                border: plan.highlight ? 'none' : '1px solid rgba(239,68,68,0.2)',
                borderTop: !plan.highlight ? `3px solid ${s.primary}` : 'none',
              }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '2px', color: plan.highlight ? 'rgba(255,255,255,0.8)' : s.textMuted }}>{plan.name}</h3>
                <div style={{ margin: '0 0 4px' }}>
                  <span style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-2px', color: plan.highlight ? '#fff' : s.text }}>{plan.price}</span>
                  <span style={{ fontSize: 15, color: plan.highlight ? 'rgba(255,255,255,0.7)' : s.textMuted, marginLeft: 6 }}>{plan.period}</span>
                </div>
                <p style={{ fontSize: 14, color: plan.highlight ? 'rgba(255,255,255,0.75)' : s.textMuted, lineHeight: 1.7, margin: '12px 0 28px' }}>{plan.desc}</p>
                <button
                  onClick={() => scrollTo('kontakt')}
                  style={{ width: '100%', padding: '13px', borderRadius: 6, border: plan.highlight ? 'none' : `1px solid rgba(239,68,68,0.4)`, cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', background: plan.highlight ? 'rgba(0,0,0,0.2)' : s.primary, color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                >
                  Vybrat
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMMUNITY CTA */}
      <section style={{ padding: '100px 40px', background: s.bg, textAlign: 'center' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 60px)', fontWeight: 900, letterSpacing: '-2px', margin: '0 0 32px', lineHeight: 1.1, textTransform: 'uppercase' }}>
            Přidej se k 2400 lidem, kteří se rozhodli změnit svůj život.
          </h2>
          <button
            onClick={() => scrollTo('kontakt')}
            style={{ padding: '18px 48px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 17, fontWeight: 800, fontFamily: 'inherit', background: s.primary, color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
          >
            Zkusit zdarma 14 dní
          </button>
        </div>
      </section>

      {/* CONTACT */}
      <section id="kontakt" style={{ padding: '80px 40px', background: s.surface }}>
        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: s.primary, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Kontakt</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-1.5px', margin: '0 0 16px', textTransform: 'uppercase' }}>Začni dnes</h2>
          <p style={{ color: s.textMuted, fontSize: 16, marginBottom: 36, lineHeight: 1.7 }}>{s.footerTagline}</p>
          <button
            onClick={() => window.open('mailto:info@fitzone.cz')}
            style={{ padding: '16px 44px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, fontFamily: 'inherit', background: s.primary, color: '#fff', textTransform: 'uppercase', letterSpacing: '1px' }}
          >
            Napsat nám
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '28px 40px', borderTop: `1px solid ${s.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontWeight: 900, fontSize: 16, color: '#fff', letterSpacing: '-0.5px' }}>{s.name}</span>
        <div style={{ display: 'flex', gap: 24 }}>
          {s.footerLinks.map(l => (<span key={l} style={{ fontSize: 13, color: s.textMuted, cursor: 'pointer' }}>{l}</span>))}
        </div>
      </footer>
    </div>
  );
}
