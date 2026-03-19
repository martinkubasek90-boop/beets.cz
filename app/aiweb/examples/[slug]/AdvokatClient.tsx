'use client';

import Link from 'next/link';
import { TestimonialCarousel, type Testimonial } from '@/components/ui/testimonial';
import type { ExampleSite } from '../data';

const TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    name: 'Martin Novák',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    description: 'Kancelář nám pomohla úspěšně vyřešit složitý obchodní spor. Profesionální přístup a vynikající výsledky.',
  },
  {
    id: 2,
    name: 'Jana Horáčková',
    avatar: 'https://randomuser.me/api/portraits/women/28.jpg',
    description: 'Při koupi nemovitosti jsem ocenila důkladnou právní kontrolu dokumentů. Cítila jsem se v naprostém bezpečí.',
  },
  {
    id: 3,
    name: 'Tomáš Beneš',
    avatar: 'https://randomuser.me/api/portraits/men/45.jpg',
    description: 'Rychlé a efektivní řešení pracovního sporu. Doporučuji každému, kdo hledá spolehlivého právního zástupce.',
  },
];

const SERVICES = [
  { num: '01', title: 'Obchodní právo', desc: 'Zakládání firem, smlouvy, fúze, akvizice. Chráníme váš byznys od prvního dne.' },
  { num: '02', title: 'Nemovitosti', desc: 'Koupě, prodej, nájmy. Prověříme každý detail před podpisem.' },
  { num: '03', title: 'Soudní spory', desc: 'Zastupujeme u soudů i v rozhodčím řízení. Bojujeme za výsledky.' },
  { num: '04', title: 'Pracovní právo', desc: 'Pracovní smlouvy, výpovědi, kolektivní vyjednávání.' },
];

const STATS = [
  { num: '500+', label: 'klientů' },
  { num: '98%', label: 'úspěšnost' },
  { num: '15 let', label: 'praxe' },
];

export default function AdvokatClient({ site: s }: { site: ExampleSite }) {
  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };

  // primary #c8a96e is light gold → use dark text on primary buttons
  const btnPrimary = (text: string, onClick?: () => void) => (
    <button
      onClick={onClick || (() => scrollTo('kontakt'))}
      style={{
        padding: '14px 30px', borderRadius: 4,
        border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
        background: s.primary, color: s.bg, transition: 'all 0.2s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
    >
      {text}
    </button>
  );

  const btnSecondary = (text: string) => (
    <button
      onClick={() => scrollTo('sluzby')}
      style={{
        padding: '14px 30px', borderRadius: 4,
        border: `1px solid ${s.primary}`, cursor: 'pointer', fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
        background: 'transparent', color: s.primary, transition: 'all 0.2s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${s.primary}18`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
    >
      {text}
    </button>
  );

  return (
    <div style={{ background: s.bg, minHeight: '100vh', color: s.text, fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .fu{animation:fadeUp 0.8s ease both}
        .d1{animation-delay:0.15s} .d2{animation-delay:0.3s} .d3{animation-delay:0.45s}
        .svc-row { display:flex; gap:48px; padding: 36px 0; border-bottom: 1px solid rgba(200,169,110,0.15); }
        .svc-row:last-child { border-bottom: none; }
        .svc-row:hover .svc-num { color: #c8a96e; }
        .svc-num { font-size: 56px; font-weight: 900; line-height: 1; color: rgba(200,169,110,0.25); transition: color 0.3s; letter-spacing: -2px; flex: 0 0 100px; }
        .svc-body { flex: 1; padding-top: 8px; }
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

      {/* SPLIT HERO */}
      <section style={{ minHeight: '100vh', display: 'flex' }}>
        {/* Left: text panel */}
        <div style={{ flex: '0 0 50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 64px', background: s.bg, position: 'relative' }}>
          <div style={{ maxWidth: 480 }}>
            <div className="fu" style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 3, background: `${s.primary}18`, border: `1px solid ${s.primary}40`, color: s.primary, fontSize: 11, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 32 }}>
              {s.heroLabel}
            </div>
            <h1 className="fu d1" style={{ fontSize: 'clamp(52px, 7vw, 88px)', fontWeight: 900, lineHeight: 0.92, letterSpacing: '-3px', margin: '0 0 28px', color: s.text }}>
              {s.heroH1.map((line, i) => (
                <span key={i} style={{ display: 'block', color: i === s.heroH1.length - 1 ? s.primary : s.text }}>{line}</span>
              ))}
            </h1>
            <p className="fu d2" style={{ fontSize: 17, color: s.textMuted, lineHeight: 1.8, maxWidth: 420, margin: '0 0 44px' }}>
              {s.heroSub}
            </p>
            <div className="fu d3" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {btnPrimary(s.heroCta)}
              {btnSecondary(s.heroCtaSecondary)}
            </div>
          </div>
        </div>
        {/* Right: photo panel */}
        <div style={{
          flex: '0 0 50%',
          backgroundImage: 'url(https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,8,15,0.4)' }} />
          <div style={{ position: 'absolute', bottom: 40, left: 40, color: '#fff' }}>
            <div style={{ width: 48, height: 2, background: s.primary, marginBottom: 16 }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: '1px' }}>Advokátní kancelář</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Praha · Brno</p>
          </div>
        </div>
      </section>

      {/* GOLD DIVIDER */}
      <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${s.primary}60, transparent)` }} />

      {/* NUMBERED SERVICES */}
      <section id="sluzby" style={{ padding: '100px 64px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 60 }}>
          <p style={{ color: s.primary, fontSize: 11, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 16 }}>Specializace</p>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-2px', margin: 0 }}>Právo, kterému rozumíme</h2>
        </div>
        <div>
          {SERVICES.map((svc) => (
            <div key={svc.num} className="svc-row">
              <div className="svc-num">{svc.num}</div>
              <div className="svc-body">
                <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 10px', color: s.text }}>{svc.title}</h3>
                <p style={{ fontSize: 15, color: s.textMuted, lineHeight: 1.75, margin: 0 }}>{svc.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* STATS STRIP */}
      <section style={{ background: s.surface, padding: '60px 64px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 0 }}>
          {STATS.map((stat, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', borderRight: i < STATS.length - 1 ? `1px solid ${s.border}` : 'none', padding: '0 40px' }}>
              <div style={{ fontSize: 'clamp(44px, 6vw, 72px)', fontWeight: 900, letterSpacing: '-2px', color: s.primary, lineHeight: 1 }}>{stat.num}</div>
              <div style={{ fontSize: 15, color: s.textMuted, marginTop: 8, letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ padding: '100px 64px', background: s.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ color: s.primary, fontSize: 11, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 16 }}>Reference</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-2px', margin: 0 }}>Co říkají naši klienti</h2>
          </div>
          <TestimonialCarousel testimonials={TESTIMONIALS} className="max-w-2xl mx-auto" />
        </div>
      </section>

      {/* CONTACT */}
      <section id="kontakt" style={{ padding: '100px 64px', background: s.surface }}>
        <div style={{ maxWidth: 600 }}>
          <p style={{ color: s.primary, fontSize: 11, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 16 }}>Kontakt</p>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-2px', margin: '0 0 20px' }}>Pojďme spolupracovat</h2>
          <p style={{ color: s.textMuted, fontSize: 16, lineHeight: 1.8, marginBottom: 14 }}>
            První konzultace je vždy zdarma. 30 minut s advokátem, bez závazků.
          </p>
          <p style={{ color: s.textMuted, fontSize: 15, marginBottom: 40 }}>
            📞 +420 800 123 456 · 📧 info@novakpartners.cz
          </p>
          {btnPrimary('Bezplatná konzultace')}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '32px 64px', borderTop: `1px solid ${s.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: s.textMuted }}>{s.footerTagline}</span>
        <div style={{ display: 'flex', gap: 24 }}>
          {s.footerLinks.map(l => (<span key={l} style={{ fontSize: 13, color: s.textMuted, cursor: 'pointer' }}>{l}</span>))}
        </div>
      </footer>
    </div>
  );
}
