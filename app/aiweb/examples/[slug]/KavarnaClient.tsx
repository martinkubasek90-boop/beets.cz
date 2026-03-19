'use client';

import Link from 'next/link';
import { InfiniteSlider } from '@/components/ui/infinite-slider';
import type { ExampleSite } from '../data';

const MENU_ITEMS = [
  { emoji: '☕', name: 'Flat White', price: '75 Kč', desc: 'Etiopie Yirgacheffe · jemná crema' },
  { emoji: '🫖', name: 'Pour Over', price: '90 Kč', desc: 'Kolumbie Huila · ovocné tóny' },
  { emoji: '🍵', name: 'Matcha Latte', price: '85 Kč', desc: 'Ceremonial grade · oatmilk' },
  { emoji: '🥐', name: 'Máslový croissant', price: '65 Kč', desc: 'Pečeno každé ráno čerstvě' },
  { emoji: '🍰', name: 'Cheesecake', price: '95 Kč', desc: 'Domácí recept · sezónní ovoce' },
  { emoji: '🥑', name: 'Avocado toast', price: '145 Kč', desc: 'Žitný chléb · pečená vajíčka' },
];

const SLIDER_ITEMS = [
  '☕ Flat White', '🫖 Pour Over', '🍵 Matcha Latte', '🥐 Croissant', '🍰 Cheesecake', '🥑 Avocado toast', '🌿 Cold Brew', '🍫 Kakao',
];

const EVENTS = [
  { date: '22. 3. 2026', name: 'Cupping workshop', desc: 'Naučte se ochutnávat a hodnotit specialitní kávy. Pro začátečníky i pokročilé.', spots: '8 míst' },
  { date: '5. 4. 2026', name: 'Latte art masterclass', desc: 'Základy a pokročilé techniky latte artu s naším head bariistou Ondřejem.', spots: '6 míst' },
];

export default function KavarnaClient({ site: s }: { site: ExampleSite }) {
  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };

  return (
    <div style={{ background: s.bg, minHeight: '100vh', color: s.text, fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .fu{animation:fadeUp 0.8s ease both}
        .d1{animation-delay:0.1s} .d2{animation-delay:0.25s} .d3{animation-delay:0.4s}
        .menu-item { padding: 20px; border-bottom: 1px solid rgba(161,98,7,0.15); display: flex; gap: 16px; align-items: flex-start; }
        .menu-item:last-child { border-bottom: none; }
        .menu-item:hover { background: rgba(161,98,7,0.05); }
        .event-card { background: rgba(161,98,7,0.06); border: 1px solid rgba(161,98,7,0.2); border-radius: 14px; padding: 28px; transition: all 0.25s; }
        .event-card:hover { border-color: rgba(161,98,7,0.4); }
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

      {/* MINIMAL STICKY NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, padding: '0 40px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: `${s.bg}f0`, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${s.border}` }}>
        <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px', color: s.text }}>{s.name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {s.footerLinks.map(l => (
            <span key={l} style={{ fontSize: 13, color: s.textMuted, cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.color = s.primary; }}
              onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.color = s.textMuted; }}>
              {l}
            </span>
          ))}
          <button
            onClick={() => scrollTo('menu')}
            style={{ padding: '8px 18px', borderRadius: 100, border: `1px solid ${s.primary}50`, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', background: 'transparent', color: s.primary, transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${s.primary}18`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            {s.heroCta}
          </button>
        </div>
      </nav>

      {/* SPLIT HERO */}
      <section style={{ display: 'flex', height: '90vh' }}>
        {/* Left: large café photo */}
        <div style={{ flex: '0 0 60%', position: 'relative', overflow: 'hidden' }}>
          <img
            src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80"
            alt="Botanika Café"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,10,6,0.25)' }} />
        </div>
        {/* Right: text */}
        <div style={{ flex: '0 0 40%', background: s.bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 48px', borderLeft: `1px solid ${s.border}` }}>
          <div className="fu" style={{ fontSize: 11, color: s.primary, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 24 }}>
            {s.heroLabel}
          </div>
          <h1 className="fu d1" style={{ fontSize: 'clamp(48px, 6vw, 80px)', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-2px', margin: '0 0 24px', color: s.text }}>
            {s.heroH1.map((line, i) => (
              <span key={i} style={{ display: 'block' }}>{line}</span>
            ))}
          </h1>
          <p className="fu d2" style={{ fontSize: 16, color: s.textMuted, lineHeight: 1.8, margin: '0 0 36px' }}>
            {s.heroSub}
          </p>
          <div className="fu d3" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => scrollTo('menu')}
              style={{ padding: '13px 28px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', background: s.primary, color: '#fff', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
            >
              {s.heroCta}
            </button>
            <button
              onClick={() => scrollTo('kontakt')}
              style={{ padding: '13px 28px', borderRadius: 8, border: `1px solid ${s.primary}50`, cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', background: 'transparent', color: s.primary, transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${s.primary}14`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              {s.heroCtaSecondary}
            </button>
          </div>
        </div>
      </section>

      {/* AMBER SLIDER SECTION */}
      <section style={{ background: `${s.primary}18`, borderTop: `1px solid ${s.primary}30`, borderBottom: `1px solid ${s.primary}30`, padding: '24px 0', overflow: 'hidden' }}>
        <InfiniteSlider gap={40} speed={35}>
          {SLIDER_ITEMS.map((item, i) => (
            <span key={i} style={{ fontSize: 16, fontWeight: 700, color: s.primary, whiteSpace: 'nowrap', padding: '0 20px' }}>
              {item}
            </span>
          ))}
        </InfiniteSlider>
      </section>

      {/* ABOUT - MAGAZINE GRID */}
      <section style={{ padding: '100px 40px', background: s.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 72, alignItems: 'center' }}>
          <div style={{ flex: '0 0 520px' }}>
            <img
              src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80"
              alt="O nás"
              style={{ width: '100%', height: 460, objectFit: 'cover', display: 'block', borderRadius: 4 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: s.primary, fontSize: 11, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 20 }}>Náš příběh</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-1.5px', margin: '0 0 24px', lineHeight: 1.1 }}>
              Víc než jen kavárna
            </h2>
            <p style={{ fontSize: 16, color: s.textMuted, lineHeight: 1.85, marginBottom: 16 }}>
              Botaniku jsme otevřeli v roce 2019 s jednou myšlenkou: kavárna by měla být místem, kde se čas zpomalí. Obklopeni tropickými rostlinami, s šálkem specialitní kávy v ruce.
            </p>
            <p style={{ fontSize: 16, color: s.textMuted, lineHeight: 1.85, margin: 0 }}>
              Naši bariisté jsou nadšenci, kteří vybírají zrna přímo od farmářů v Etiopii, Kolumbii a Guatemale. Každý šálek je malý příběh.
            </p>
          </div>
        </div>
      </section>

      {/* COFFEE PHOTO GRID */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
        {['1509042239860-f550ce710b93', '1521302200778-33500533c50c', '1461023058943-07fcbe16d735'].map((id) => (
          <img
            key={id}
            src={`https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=500&q=80`}
            alt="Kavárna"
            style={{ width: '100%', height: 300, objectFit: 'cover', display: 'block' }}
          />
        ))}
      </section>

      {/* MENU HIGHLIGHTS */}
      <section id="menu" style={{ padding: '100px 40px', background: s.surface }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ color: s.primary, fontSize: 11, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 16 }}>Menu</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 900, letterSpacing: '-2px', margin: 0 }}>Co u nás najdeš</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0, border: `1px solid ${s.border}`, borderRadius: 12, overflow: 'hidden' }}>
            {MENU_ITEMS.map((item, i) => (
              <div key={i} className="menu-item" style={{ borderRight: i % 2 === 0 ? `1px solid ${s.border}` : 'none' }}>
                <span style={{ fontSize: 28 }}>{item.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: s.text }}>{item.name}</h3>
                    <span style={{ fontSize: 14, fontWeight: 700, color: s.primary }}>{item.price}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: s.textMuted, lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EVENTS SECTION */}
      <section style={{ padding: '100px 40px', background: s.bg }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 48 }}>
            <p style={{ color: s.primary, fontSize: 11, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 16 }}>Akce</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-1.5px', margin: 0 }}>Akce & Workshopy</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
            {EVENTS.map((event, i) => (
              <div key={i} className="event-card">
                <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 100, background: `${s.primary}20`, color: s.primary, fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
                  {event.date}
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 10px', color: s.text }}>{event.name}</h3>
                <p style={{ fontSize: 14, color: s.textMuted, lineHeight: 1.7, margin: '0 0 16px' }}>{event.desc}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: s.primary, fontWeight: 600 }}>📍 {event.spots}</span>
                  <button
                    onClick={() => scrollTo('kontakt')}
                    style={{ padding: '8px 18px', borderRadius: 6, border: `1px solid ${s.primary}`, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', background: 'transparent', color: s.primary }}
                  >
                    Rezervovat
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WARM CTA */}
      <section id="kontakt" style={{ padding: '100px 40px', background: `linear-gradient(135deg, ${s.primary}20, rgba(161,98,7,0.08))`, borderTop: `1px solid ${s.primary}25`, textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-2px', margin: '0 0 20px' }}>
            {s.sections[1]?.title}
          </h2>
          <p style={{ fontSize: 17, color: s.textMuted, margin: '0 0 12px', lineHeight: 1.7 }}>{s.sections[1]?.sub}</p>
          <p style={{ fontSize: 14, color: s.textMuted, margin: '0 0 40px' }}>📍 Mánesova 12, Praha 2 · Po–Ne 8:00–20:00</p>
          <button
            onClick={() => window.open('https://maps.google.com')}
            style={{ padding: '16px 40px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, fontFamily: 'inherit', background: s.primary, color: '#fff', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
          >
            {s.sections[1]?.ctaText || s.heroCta}
          </button>
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
