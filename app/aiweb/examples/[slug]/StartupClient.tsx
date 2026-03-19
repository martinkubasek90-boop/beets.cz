'use client';

import Link from 'next/link';
import type { ExampleSite } from '../data';

const STATS = [
  { num: '500+', label: 'firem' },
  { num: '15h', label: 'ušetřeno/týden' },
  { num: '200+', label: 'integrací' },
  { num: '99.9%', label: 'uptime' },
];

const HOW = [
  { num: '1', title: 'Připojte nástroje', desc: 'Integrujte Slack, Notion, Salesforce a další. Nastavení do 10 minut.' },
  { num: '2', title: 'Definujte procesy', desc: 'Vizuálním editorem popište workflow. Žádné kódování.' },
  { num: '3', title: 'Sledujte výsledky', desc: 'Real-time dashboard ukáže úspory času a ROI v korunách.' },
];

const PRICING = [
  { icon: '🚀', name: 'Starter', price: '$49/měs', desc: '5 uživatelů, 10 automatizací, základní integrace', highlight: false },
  { icon: '⚡', name: 'Business', price: '$199/měs', desc: '25 uživatelů, neomezené automatizace, prioritní support', highlight: true, badge: 'Nejoblíbenější' },
  { icon: '🏢', name: 'Enterprise', price: 'Na míru', desc: 'SLA, dedikovaný support, on-premise varianta', highlight: false },
];

const TEAM_SHOTS = [
  {
    src: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80',
    title: 'Produktový workshop',
    desc: 'Mapování procesů s klientem během jednoho odpoledne.',
  },
  {
    src: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80',
    title: 'Tým implementace',
    desc: 'CX, onboarding a integrace vedené jedním delivery týmem.',
  },
];

const CUSTOMER_STORY = {
  company: 'Scaleup Labs',
  quote: 'Za šest týdnů jsme převedli schvalování nákupů a onboarding lidí do jedné platformy. NovaTech nám vrátil desítky hodin týdně.',
  resultA: '142 h',
  resultB: '3 týdny',
};

export default function StartupClient({ site: s }: { site: ExampleSite }) {
  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };

  return (
    <div style={{ background: s.bg, minHeight: '100vh', color: s.text, fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        .fu{animation:fadeUp 0.8s ease both}
        .d1{animation-delay:0.1s} .d2{animation-delay:0.25s} .d3{animation-delay:0.4s} .d4{animation-delay:0.55s}
        .feature-card { background: rgba(139,92,246,0.05); border: 1px solid rgba(139,92,246,0.18); border-top: 3px solid #8b5cf6; border-radius: 14px; padding: 28px; transition: all 0.25s; }
        .feature-card:hover { background: rgba(139,92,246,0.1); transform: translateY(-3px); }
        .pricing-card { border-radius: 16px; padding: 36px 32px; border: 1px solid rgba(139,92,246,0.2); transition: all 0.25s; }
        .pricing-card:hover { transform: translateY(-4px); }
        .team-shot { position: relative; overflow: hidden; border-radius: 18px; min-height: 340px; }
        .team-shot img { width: 100%; height: 100%; object-fit: cover; display: block; }
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
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: `${s.bg}f5`, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${s.border}` }}>
        <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px', color: s.primary, textShadow: `0 0 20px ${s.primary}60` }}>{s.name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {s.footerLinks.map(l => (
            <span key={l} style={{ fontSize: 14, color: s.textMuted, cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.color = s.text; }}
              onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.color = s.textMuted; }}>
              {l}
            </span>
          ))}
          <button
            onClick={() => scrollTo('kontakt')}
            style={{ padding: '10px 22px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', background: s.primary, color: '#fff', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
          >
            {s.heroCta}
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding: '120px 40px 80px', textAlign: 'center' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div className="fu" style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 100, background: `${s.primary}18`, border: `1px solid ${s.primary}35`, color: s.primary, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 28 }}>
            {s.heroLabel}
          </div>
          <h1 className="fu d1" style={{ fontSize: 'clamp(44px, 8vw, 88px)', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-3px', margin: '0 0 28px' }}>
            {s.heroH1.map((line, i) => (
              <span key={i} style={{
                display: 'block',
                background: i === 1 ? `linear-gradient(135deg, ${s.primary}, #3b82f6)` : 'none',
                WebkitBackgroundClip: i === 1 ? 'text' : 'unset',
                WebkitTextFillColor: i === 1 ? 'transparent' : 'unset',
                color: i === 1 ? 'transparent' : s.text,
              }}>{line}</span>
            ))}
          </h1>
          <p className="fu d2" style={{ fontSize: 18, color: s.textMuted, lineHeight: 1.75, maxWidth: 560, margin: '0 auto 44px' }}>
            {s.heroSub}
          </p>
          <div className="fu d3" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 72 }}>
            <button
              onClick={() => scrollTo('kontakt')}
              style={{ padding: '16px 36px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, fontFamily: 'inherit', background: s.primary, color: '#fff', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
            >
              {s.heroCta}
            </button>
            <button
              onClick={() => scrollTo('jak-to-funguje')}
              style={{ padding: '16px 36px', borderRadius: 10, border: `1px solid ${s.border}`, cursor: 'pointer', fontSize: 16, fontWeight: 700, fontFamily: 'inherit', background: 'transparent', color: s.text, transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = s.primary; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = s.border; }}
            >
              {s.heroCtaSecondary}
            </button>
          </div>

          {/* CSS DASHBOARD MOCKUP */}
          <div className="fu d4" style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid rgba(139,92,246,0.3)`, boxShadow: `0 40px 80px rgba(0,0,0,0.5), 0 0 60px rgba(139,92,246,0.15)` }}>
            {/* Browser header */}
            <div style={{ background: '#0e0e1f', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 6, height: 24, margin: '0 24px', display: 'flex', alignItems: 'center', paddingLeft: 12 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>app.novatech.io/dashboard</span>
              </div>
            </div>
            {/* Dashboard content */}
            <div style={{ background: '#080b1a', padding: '24px', display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, height: 280 }}>
              {/* Sidebar */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '16px 12px' }}>
                {['Dashboard', 'Automatizace', 'Integrace', 'Reporty', 'Nastavení'].map((item, i) => (
                  <div key={i} style={{ padding: '8px 12px', borderRadius: 6, marginBottom: 4, background: i === 0 ? `${s.primary}20` : 'transparent', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: i === 0 ? s.primary : 'rgba(255,255,255,0.2)' }} />
                    <span style={{ fontSize: 12, color: i === 0 ? s.primary : 'rgba(255,255,255,0.4)' }}>{item}</span>
                  </div>
                ))}
              </div>
              {/* Main content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {[['Ušetřeno', '284h', '#8b5cf6'], ['Spuštěné', '12', '#10b981'], ['Integrace', '23', '#3b82f6'], ['Úspěšnost', '99.2%', '#f59e0b']].map(([label, val, color], i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '14px', border: `1px solid rgba(255,255,255,0.06)` }}>
                      <p style={{ margin: '0 0 4px', fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</p>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: color as string }}>{val}</p>
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '16px', display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                  {[40, 65, 45, 80, 55, 90, 70, 95, 60, 85, 75, 100].map((h, i) => (
                    <div key={i} style={{ flex: 1, height: `${h}%`, background: `linear-gradient(to top, ${s.primary}80, ${s.primary}20)`, borderRadius: '3px 3px 0 0' }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section style={{ background: s.surface, borderTop: `1px solid ${s.border}`, borderBottom: `1px solid ${s.border}`, padding: '40px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 32 }}>
          {STATS.map((stat, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-2px', color: s.text }}>{stat.num}</div>
              <div style={{ fontSize: 13, color: s.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TEAM / DELIVERY STORY */}
      <section style={{ padding: '100px 40px', background: s.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 28, alignItems: 'stretch' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            {TEAM_SHOTS.map((shot) => (
              <div key={shot.title} className="team-shot">
                <img src={shot.src} alt={shot.title} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(4,5,15,0.88), rgba(4,5,15,0.08))' }} />
                <div style={{ position: 'absolute', left: 20, right: 20, bottom: 18 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{shot.title}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(241,245,249,0.72)' }}>{shot.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 24, padding: '40px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ color: s.primary, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 12px' }}>Customer story</p>
            <h2 style={{ fontSize: 'clamp(30px, 4vw, 52px)', fontWeight: 900, letterSpacing: '-2px', margin: '0 0 18px' }}>
              Nasazení bez chaosu
            </h2>
            <p style={{ fontSize: 17, color: s.textMuted, lineHeight: 1.8, margin: '0 0 22px' }}>
              {CUSTOMER_STORY.quote}
            </p>
            <div style={{ fontSize: 14, fontWeight: 700, color: s.text, marginBottom: 28 }}>{CUSTOMER_STORY.company}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ padding: 18, borderRadius: 16, background: 'rgba(139,92,246,0.08)', border: `1px solid rgba(139,92,246,0.18)` }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: s.primary }}>{CUSTOMER_STORY.resultA}</div>
                <div style={{ fontSize: 13, color: s.textMuted, lineHeight: 1.6 }}>ušetřených každý měsíc v interních operacích</div>
              </div>
              <div style={{ padding: 18, borderRadius: 16, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#60a5fa' }}>{CUSTOMER_STORY.resultB}</div>
                <div style={{ fontSize: 13, color: s.textMuted, lineHeight: 1.6 }}>od briefu po první funkční workflow v produkci</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES 2x2 */}
      <section style={{ padding: '100px 40px', background: s.bg }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ color: s.primary, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Funkce</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-2px', margin: 0 }}>{s.sections[0]?.title}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
            {s.sections[0]?.items?.map((item, i) => (
              <div key={i} className="feature-card">
                <div style={{ fontSize: 32, marginBottom: 16 }}>{item.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 10px' }}>{item.title}</h3>
                <p style={{ fontSize: 15, color: s.textMuted, lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF STRIP */}
      <section style={{ padding: '56px 40px', background: s.surface, borderTop: `1px solid ${s.border}`, borderBottom: `1px solid ${s.border}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 12, color: s.primary, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 6px' }}>Používají týmy z</p>
            <h3 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>SaaS, financí i retailu</h3>
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {['Scaleup Labs', 'Finport', 'Northgrid', 'Bricklane', 'Astera Ops'].map((name) => (
              <div key={name} style={{ padding: '12px 16px', borderRadius: 999, border: `1px solid ${s.border}`, background: 'rgba(255,255,255,0.03)', color: s.textMuted, fontSize: 13, fontWeight: 700 }}>
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="jak-to-funguje" style={{ padding: '100px 40px', background: s.surface }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ color: s.primary, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Jak to funguje</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-2px', margin: 0 }}>Tři kroky k automatizaci</h2>
          </div>
          <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 28, left: '16.67%', right: '16.67%', height: 1, background: `linear-gradient(to right, ${s.primary}, ${s.primary}40)`, zIndex: 0 }} />
            {HOW.map((step, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', padding: '0 24px', position: 'relative', zIndex: 1 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, ${s.primary}, #3b82f6)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 22, margin: '0 auto 24px' }}>
                  {step.num}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 12px' }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: s.textMuted, lineHeight: 1.7, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: '100px 40px', background: s.bg }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ color: s.primary, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Ceník</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-2px', margin: 0 }}>{s.sections[1]?.title}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {PRICING.map((plan) => (
              <div key={plan.name} className="pricing-card" style={{
                background: plan.highlight ? `${s.primary}14` : s.surface,
                border: plan.highlight ? `2px solid ${s.primary}` : `1px solid ${s.border}`,
                position: 'relative',
              }}>
                {plan.badge && (
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: s.primary, color: '#fff', padding: '4px 16px', borderRadius: 100, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {plan.badge}
                  </div>
                )}
                <div style={{ fontSize: 32, marginBottom: 16 }}>{plan.icon}</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>{plan.name}</h3>
                <div style={{ fontSize: 32, fontWeight: 900, color: s.primary, margin: '0 0 16px', letterSpacing: '-1px' }}>{plan.price}</div>
                <p style={{ fontSize: 14, color: s.textMuted, lineHeight: 1.7, margin: '0 0 28px' }}>{plan.desc}</p>
                <button
                  onClick={() => scrollTo('kontakt')}
                  style={{ width: '100%', padding: '12px', borderRadius: 8, border: plan.highlight ? 'none' : `1px solid ${s.border}`, cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', background: plan.highlight ? s.primary : 'transparent', color: plan.highlight ? '#fff' : s.text, transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                >
                  Začít
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTEGRATION LOGOS */}
      <section style={{ padding: '48px 40px', background: s.surface, borderTop: `1px solid ${s.border}`, textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: s.textMuted, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600 }}>Integruje se s</p>
        <p style={{ fontSize: 18, color: s.text, fontWeight: 700, letterSpacing: '1px' }}>Slack · Notion · Salesforce · SAP · Jira · Stripe</p>
      </section>

      {/* CONTACT */}
      <section id="kontakt" style={{ padding: '80px 40px', background: s.bg, textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <p style={{ color: s.primary, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Kontakt</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-1.5px', margin: '0 0 16px' }}>Začněte zdarma</h2>
          <p style={{ color: s.textMuted, fontSize: 16, marginBottom: 36, lineHeight: 1.7 }}>14 dní zdarma, bez kreditní karty. Zrušte kdykoliv.</p>
          <button
            onClick={() => window.open('mailto:hello@novatech.io')}
            style={{ padding: '16px 44px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, fontFamily: 'inherit', background: s.primary, color: '#fff' }}
          >
            {s.heroCta}
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
