'use client';

import Link from 'next/link';
import AuroraHero from '@/components/ui/digital-aurora';
import type { ExampleSite } from '../data';

export default function RestauraaceClient({ site: s }: { site: ExampleSite }) {
  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };

  const dishes = [
    { id: '1504674900247-0877df9cc836', name: 'Svíčková na smetaně' },
    { id: '1414235077428-338989a2e8c0', name: 'Hovězí tatarák' },
    { id: '1547592166-23ac45744acd', name: 'Bramborová polévka' },
  ];

  return (
    <div style={{ background: s.bg, minHeight: '100vh', color: s.text, fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        .dish-card { position: relative; overflow: hidden; flex: 1; }
        .dish-card img { transition: transform 0.5s ease; width: 100%; height: 280px; object-fit: cover; display: block; }
        .dish-card:hover img { transform: scale(1.06); }
        .dish-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 16px 20px; background: linear-gradient(to top, rgba(0,0,0,0.85), transparent); }
        .feature-line { border-left: 3px solid #e85d04; padding-left: 20px; margin-bottom: 28px; }
        .feature-line:last-child { margin-bottom: 0; }
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

      {/* STICKY NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, padding: '0 32px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: `${s.bg}f0`, backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(232,93,4,0.25)' }}>
        <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', color: '#fef3c7' }}>{s.name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {s.footerLinks.map(l => (
            <span key={l} style={{ fontSize: 14, color: s.textMuted, cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.color = s.primary; }}
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

      {/* AURORA HERO */}
      <AuroraHero
        title={s.heroH1.join(' ')}
        description={s.heroSub}
        badgeLabel={s.heroLabel.split('·')[0]?.trim()}
        badgeText={s.heroLabel.split('·').slice(1).join('·').trim()}
        ctaButtons={[
          { text: s.heroCta, href: '#kontakt', primary: true },
          { text: s.heroCtaSecondary, href: '#menu' },
        ]}
        microDetails={['Čerstvé suroviny', 'Moravská vína', 'Soukromé akce']}
      />

      {/* FULL-WIDTH DISH PHOTO STRIP */}
      <section id="menu" style={{ display: 'flex', gap: 0 }}>
        {dishes.map((dish) => (
          <div key={dish.id} className="dish-card">
            <img
              src={`https://images.unsplash.com/photo-${dish.id}?auto=format&fit=crop&w=600&q=80`}
              alt={dish.name}
            />
            <div className="dish-overlay">
              <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: '#fff', letterSpacing: '0.5px' }}>{dish.name}</p>
            </div>
          </div>
        ))}
      </section>

      {/* TWO-COLUMN: CHEF PHOTO + FEATURE LIST */}
      <section style={{ padding: '80px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 0, alignItems: 'stretch', padding: '0 40px' }}>
          {/* Left: Chef photo */}
          <div style={{ flex: '0 0 480px', marginRight: 64 }}>
            <img
              src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=800&q=80"
              alt="Šéfkuchař Martin Král"
              style={{ width: '100%', height: 500, objectFit: 'cover', borderRadius: 4, display: 'block' }}
            />
            <p style={{ marginTop: 14, fontSize: 13, color: s.textMuted, fontStyle: 'italic' }}>Martin Král · Šéfkuchař · 20 let zkušeností</p>
          </div>
          {/* Right: Feature list */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ color: s.primary, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Proč k nám</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 900, letterSpacing: '-1.5px', margin: '0 0 40px', lineHeight: 1.1 }}>
              {s.sections[0]?.title}
            </h2>
            {s.sections[0]?.items?.map((item, i) => (
              <div key={i} className="feature-line">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: s.text }}>{item.title}</h3>
                </div>
                <p style={{ margin: 0, fontSize: 14, color: s.textMuted, lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AMBER CTA BOX */}
      <section style={{ background: 'rgba(232,93,4,0.12)', borderTop: '1px solid rgba(232,93,4,0.3)', borderBottom: '1px solid rgba(232,93,4,0.3)', padding: '60px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-1px', margin: '0 0 14px', color: s.text }}>
            {s.sections[1]?.title}
          </h2>
          {s.sections[1]?.sub && (
            <p style={{ fontSize: 17, color: s.textMuted, margin: '0 0 36px', lineHeight: 1.7 }}>{s.sections[1].sub}</p>
          )}
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => scrollTo('kontakt')}
              style={{ padding: '16px 36px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, fontFamily: 'inherit', background: s.primary, color: '#fff', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
            >
              {s.sections[1]?.ctaText || s.heroCta}
            </button>
            <button
              onClick={() => scrollTo('menu')}
              style={{ padding: '16px 36px', borderRadius: 6, border: `1px solid ${s.primary}`, cursor: 'pointer', fontSize: 16, fontWeight: 700, fontFamily: 'inherit', background: 'transparent', color: s.primary, transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${s.primary}18`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              {s.heroCtaSecondary}
            </button>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="kontakt" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <p style={{ color: s.primary, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Rezervace</p>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 900, letterSpacing: '-1px', margin: '0 0 16px' }}>Zarezervujte si stůl</h2>
          <p style={{ color: s.textMuted, fontSize: 16, marginBottom: 12, lineHeight: 1.7 }}>Kapacita je omezená. Rezervujte online nebo nás kontaktujte telefonicky.</p>
          <p style={{ color: s.textMuted, fontSize: 15, marginBottom: 36 }}>📞 +420 222 111 333 · 📍 Náměstí Míru 12, Praha 2</p>
          <button
            onClick={() => window.open('tel:+420222111333')}
            style={{ padding: '16px 36px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, fontFamily: 'inherit', background: s.primary, color: '#fff' }}
          >
            Zavolat a rezervovat
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '32px 40px', borderTop: `1px solid ${s.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <span style={{ fontWeight: 900, fontSize: 16, color: '#fef3c7', marginRight: 16 }}>{s.name}</span>
          <span style={{ fontSize: 13, color: s.textMuted }}>{s.footerTagline}</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {s.footerLinks.map(l => (<span key={l} style={{ fontSize: 13, color: s.textMuted, cursor: 'pointer' }}>{l}</span>))}
        </div>
      </footer>
    </div>
  );
}
