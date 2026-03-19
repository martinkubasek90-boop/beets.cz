'use client';

import { useState, useEffect } from 'react';
import { SmokeBackground } from '@/components/ui/spooky-smoke-animation';

/* ─────────────────────────────────────────────
   DATA  –  uprav dle potřeby
───────────────────────────────────────────── */

const PROJECTS = [
  {
    id: 1,
    title: 'DUST & CRATES Vol. 1',
    year: '2022',
    desc: 'Debut EP. 7 beatů plně nahraných na MPC 3000. Sampleované z vinylů 70s soul a funk.',
    // Vlož svůj Bandcamp album ID sem → src="https://bandcamp.com/EmbeddedPlayer/album=TVOJE_ID/..."
    bandcampSrc: 'https://bandcamp.com/EmbeddedPlayer/album=0000000001/size=large/bgcol=1a1a1a/linkcol=c8a96e/tracklist=true/artwork=small/transparent=true/',
    tags: ['Boom-Bap', 'Soul', 'MPC 3000'],
  },
  {
    id: 2,
    title: 'LATE NIGHT LOOPS',
    year: '2023',
    desc: 'Instrumentální tape. Noční nálady, jazz breaks, dusné basy. Nahráno v jednu v noci.',
    bandcampSrc: 'https://bandcamp.com/EmbeddedPlayer/album=0000000002/size=large/bgcol=1a1a1a/linkcol=c8a96e/tracklist=true/artwork=small/transparent=true/',
    tags: ['Jazz', 'Lo-Fi', 'Tape'],
  },
  {
    id: 3,
    title: 'RAW MATHEMATICS',
    year: '2024',
    desc: 'Kolaborace s MC z Prahy a Brna. 12 tracků, 0 kompromisů. Hip-hop v nejčistší formě.',
    bandcampSrc: 'https://bandcamp.com/EmbeddedPlayer/album=0000000003/size=large/bgcol=1a1a1a/linkcol=c8a96e/tracklist=true/artwork=small/transparent=true/',
    tags: ['Hip-Hop', 'Kolabo', 'Boom-Bap'],
  },
];

const IN_PROGRESS = [
  {
    icon: '🎚️',
    title: 'Nové album – "IRON CURTAIN BEATS"',
    desc: 'Full-length projekt inspirovaný Eastern European samples. Plánované vydání: podzim 2025.',
    status: 'V produkci',
    statusColor: '#c8a96e',
  },
  {
    icon: '🎤',
    title: 'Kolaborace s MC Jakubem K.',
    desc: 'EP formát, 6 tracků. Texty o ulici, paměti a hudbě. Nahrávání probíhá.',
    status: 'Nahrávání',
    statusColor: '#a78bfa',
  },
  {
    icon: '📼',
    title: 'Beat tape "CRATE DIGGER SESSIONS"',
    desc: 'Lo-fi beat tape ze session nahrávek. Surový, neupravený zvuk přímého záznamu z MPC.',
    status: 'Mixování',
    statusColor: '#34d399',
  },
  {
    icon: '🎬',
    title: 'Video dokumentace – MPC workflow',
    desc: 'Dokumentuji svůj proces tvorby na MPC 3000 – od samplování po finální track.',
    status: 'Natáčení',
    statusColor: '#60a5fa',
  },
];

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */

export default function NineTeezPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id.replace('#', ''))?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ background: '#080808', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)' }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(28px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes flicker {
          0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:0.4} 95%{opacity:1} 97%{opacity:0.6} 98%{opacity:1}
        }
        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .fade-up { animation: fadeUp 0.8s ease both; }
        .d1 { animation-delay: 0.1s; }
        .d2 { animation-delay: 0.25s; }
        .d3 { animation-delay: 0.4s; }
        .d4 { animation-delay: 0.55s; }
        .gold { color: #c8a96e; }
        .gold-grad {
          background: linear-gradient(135deg, #c8a96e 0%, #f0d080 50%, #a07040 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .card-dark {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(200,169,110,0.12);
          transition: all 0.3s ease;
        }
        .card-dark:hover {
          border-color: rgba(200,169,110,0.35);
          background: rgba(200,169,110,0.04);
          transform: translateY(-3px);
        }
        .nav-link {
          color: #64748b;
          transition: color 0.2s;
          cursor: pointer;
          letter-spacing: 2px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .nav-link:hover { color: #c8a96e; }
        .tag {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          background: rgba(200,169,110,0.1);
          border: 1px solid rgba(200,169,110,0.25);
          color: #c8a96e;
        }
        .mpc-glow {
          filter: drop-shadow(0 0 40px rgba(200,169,110,0.2)) drop-shadow(0 0 80px rgba(200,169,110,0.08));
        }
        .section-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: #c8a96e;
          margin-bottom: 12px;
        }
        .divider {
          border: none;
          border-top: 1px solid rgba(200,169,110,0.1);
          margin: 0;
        }
        iframe.bandcamp { border:0; width:100%; border-radius:8px; display:block; }
        @media (max-width:768px) {
          .desktop-nav { display:none !important; }
          .burger { display:block !important; }
        }
      `}</style>

      {/* ─── NAV ─── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 24px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'all 0.3s',
        background: scrolled ? 'rgba(8,8,8,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(200,169,110,0.12)' : '1px solid transparent',
      }}>
        <span
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ fontSize: 18, fontWeight: 900, letterSpacing: '4px', cursor: 'pointer', animation: 'flicker 8s infinite' }}
        >
          <span className="gold-grad">NINETEEZ</span>
        </span>

        <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {[
            { l: 'Story', h: 'story' },
            { l: 'Projekty', h: 'projekty' },
            { l: 'In Progress', h: 'progress' },
            { l: 'Kontakt', h: 'kontakt' },
          ].map(({ l, h }) => (
            <span key={h} className="nav-link" onClick={() => scrollTo(h)}>{l}</span>
          ))}
        </nav>

        {/* Burger */}
        <button className="burger" onClick={() => setMenuOpen(!menuOpen)} style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: 22, height: 2, background: '#c8a96e', borderRadius: 2, marginBottom: i < 2 ? 5 : 0,
              transition: 'all 0.3s',
              transform: menuOpen && i === 0 ? 'rotate(45deg) translateY(7px)' : menuOpen && i === 2 ? 'rotate(-45deg) translateY(-7px)' : 'none',
              opacity: menuOpen && i === 1 ? 0 : 1,
            }} />
          ))}
        </button>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: 60, left: 0, right: 0, zIndex: 99,
          background: 'rgba(8,8,8,0.98)', borderBottom: '1px solid rgba(200,169,110,0.12)',
          padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          {[{ l: 'Story', h: 'story' }, { l: 'Projekty', h: 'projekty' }, { l: 'In Progress', h: 'progress' }, { l: 'Kontakt', h: 'kontakt' }].map(({ l, h }) => (
            <span key={h} className="nav-link" style={{ fontSize: 14 }} onClick={() => scrollTo(h)}>{l}</span>
          ))}
        </div>
      )}

      {/* ─── HERO ─── */}
      <section style={{ position: 'relative', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {/* Smoke BG */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <SmokeBackground smokeColor="#c8a96e" />
        </div>

        {/* Dark overlay so smoke doesn't overpower */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'rgba(8,8,8,0.55)' }} />

        {/* Text content */}
        <div style={{ position: 'relative', zIndex: 3, textAlign: 'center', padding: '0 24px' }}>
          <p className="fade-up d1 section-label" style={{ marginBottom: 16 }}>Beatmaker · Praha · Since 2010</p>

          <h1 className="fade-up d2" style={{
            fontSize: 'clamp(56px, 14vw, 130px)',
            fontWeight: 900,
            letterSpacing: '-2px',
            lineHeight: 0.9,
            margin: '0 0 20px',
          }}>
            <span className="gold-grad" style={{ animation: 'flicker 8s infinite' }}>NINETEEZ</span>
          </h1>

          <p className="fade-up d3" style={{ fontSize: 'clamp(13px, 2vw, 16px)', color: '#64748b', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: 40 }}>
            Beats. Samples. Grooves. — MPC 3000
          </p>

          <div className="fade-up d4" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => scrollTo('projekty')}
              style={{
                padding: '13px 28px', borderRadius: 4, border: '1px solid #c8a96e', cursor: 'pointer',
                fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
                background: '#c8a96e', color: '#080808', transition: 'all 0.25s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f0d080'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#c8a96e'; }}
            >
              Projekty
            </button>
            <button
              onClick={() => scrollTo('story')}
              style={{
                padding: '13px 28px', borderRadius: 4, cursor: 'pointer',
                fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
                background: 'transparent', border: '1px solid rgba(200,169,110,0.4)',
                color: '#c8a96e', transition: 'all 0.25s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#c8a96e'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,169,110,0.4)'; }}
            >
              Moje Story
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 10, letterSpacing: '3px', color: '#334155', textTransform: 'uppercase' }}>Scroll</span>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, #c8a96e, transparent)' }} />
        </div>
      </section>

      {/* ─── STORY ─── */}
      <section id="story" style={{ padding: '100px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 64, alignItems: 'center' }}>
          {/* Text */}
          <div>
            <p className="section-label">Moje Story</p>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.1, margin: '0 0 28px' }}>
              Od samplerů<br />k <span className="gold-grad">umění</span>.
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                {
                  year: '2010',
                  text: 'Začal jsem se zajímat o hip-hop produkci. Prvních pár let jsem pracoval na software – FL Studio, Reason. Ale něco chybělo.',
                },
                {
                  year: '2014',
                  text: 'Koupil jsem svůj první hardware sampler. Okamžitě jsem pochopil, co znamená tvořit rukama. Ten feeling nenahradí žádný plugin.',
                },
                {
                  year: '2017',
                  text: 'Našel jsem MPC 3000 na bazarze. Stroj z roku 1994, který používali J Dilla, Pete Rock, DJ Premier. Od té chvíle je to můj hlavní nástroj.',
                },
                {
                  year: '2022+',
                  text: 'Vydávám projekty pod jménem NINETEEZ. Čistý boom-bap zvuk, vinylové samplesy, živé bicí. Hudba, která vzdává hold zlaté éře hip-hopu.',
                },
              ].map(({ year, text }) => (
                <div key={year} style={{ display: 'flex', gap: 20 }}>
                  <div style={{ width: 48, flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#c8a96e', letterSpacing: '1px', paddingTop: 3 }}>{year}</div>
                  <div style={{ color: '#64748b', lineHeight: 1.75, fontSize: 15, borderLeft: '1px solid rgba(200,169,110,0.2)', paddingLeft: 20 }}>
                    {text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats / vibe box */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Big quote */}
            <div className="card-dark" style={{ padding: '32px', borderRadius: 8, marginBottom: 8 }}>
              <p style={{ fontSize: 'clamp(18px, 3vw, 26px)', fontWeight: 700, lineHeight: 1.4, color: '#e2e8f0', fontStyle: 'italic', marginBottom: 16 }}>
                &ldquo;The MPC 3000 isn&apos;t just a machine. It&apos;s a philosophy.&rdquo;
              </p>
              <p style={{ color: '#334155', fontSize: 13 }}>— NINETEEZ</p>
            </div>

            {/* Numbers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { val: '14+', label: 'Let v game' },
                { val: '3', label: 'Vydané projekty' },
                { val: '∞', label: 'Crates prohledáno' },
                { val: '1', label: 'MPC 3000' },
              ].map(({ val, label }) => (
                <div key={label} className="card-dark" style={{ padding: '24px 20px', borderRadius: 8, textAlign: 'center' }}>
                  <div className="gold-grad" style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, marginBottom: 6 }}>{val}</div>
                  <div style={{ fontSize: 11, color: '#475569', letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Influences */}
            <div className="card-dark" style={{ padding: '20px 24px', borderRadius: 8 }}>
              <p style={{ fontSize: 11, color: '#475569', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>Vlivy</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['J Dilla', 'Pete Rock', 'DJ Premier', 'Madlib', 'RZA', 'Large Professor', 'Buckwild'].map(n => (
                  <span key={n} className="tag">{n}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* ─── PROJEKTY ─── */}
      <section id="projekty" style={{ padding: '100px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p className="section-label">Vydané projekty</p>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-1.5px', margin: 0 }}>
            Discografie
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
          {PROJECTS.map((p, i) => (
            <div key={p.id} className="card-dark" style={{
              borderRadius: 10, padding: '32px',
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 32, alignItems: 'start',
            }}>
              {/* Info */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <span style={{ fontSize: 11, color: '#334155', fontWeight: 700, letterSpacing: '1px' }}>0{i + 1}</span>
                  <span className="gold" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}>{p.year}</span>
                </div>
                <h3 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 900, letterSpacing: '-0.5px', margin: '0 0 12px', color: '#f1f5f9' }}>
                  {p.title}
                </h3>
                <p style={{ color: '#64748b', lineHeight: 1.75, fontSize: 14, marginBottom: 20 }}>{p.desc}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {p.tags.map(t => <span key={t} className="tag">{t}</span>)}
                </div>
              </div>

              {/* Bandcamp embed */}
              <div>
                <p style={{ fontSize: 11, color: '#334155', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>
                  Poslechni na Bandcamp
                </p>
                {/*
                  Jak nastavit Bandcamp embed:
                  1. Jdi na bandcamp.com → svůj album → Share/Embed
                  2. Zkopíruj iframe src URL
                  3. Vlož do bandcampSrc v PROJECTS poli výše
                */}
                <iframe
                  className="bandcamp"
                  src={p.bandcampSrc}
                  height={120}
                  seamless
                  title={`Bandcamp player – ${p.title}`}
                />
                <p style={{ fontSize: 11, color: '#1e293b', marginTop: 8, fontStyle: 'italic' }}>
                  * Nahraď bandcampSrc svým album ID z Bandcamp embed
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <hr className="divider" />

      {/* ─── IN PROGRESS ─── */}
      <section id="progress" style={{ padding: '100px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p className="section-label">V pohybu</p>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-1.5px', margin: '0 0 16px' }}>
            Na čem právě <span className="gold-grad">pracuji</span>
          </h2>
          <p style={{ color: '#334155', fontSize: 15, margin: 0 }}>
            Věci, které se rodí v mém studiu právě teď.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {IN_PROGRESS.map((item) => (
            <div key={item.title} className="card-dark" style={{ padding: '28px', borderRadius: 10 }}>
              <div style={{ fontSize: 28, marginBottom: 16 }}>{item.icon}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
                  padding: '3px 10px', borderRadius: 100,
                  background: `${item.statusColor}18`, border: `1px solid ${item.statusColor}40`,
                  color: item.statusColor,
                }}>{item.status}</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: '0 0 10px', lineHeight: 1.3 }}>{item.title}</h3>
              <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <hr className="divider" />

      {/* ─── KONTAKT ─── */}
      <section id="kontakt" style={{ padding: '100px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <p className="section-label">Kontakt</p>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-1.5px', margin: '0 0 20px' }}>
            Pojďme tvořit.
          </h2>
          <p style={{ color: '#475569', fontSize: 16, lineHeight: 1.8, marginBottom: 40 }}>
            Hledáš beaty pro svůj projekt? Chceš kolaborovat?<br />
            Napiš mi. Odpovídám do 48 hodin.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 48 }}>
            {[
              { label: 'E-mail', value: 'nineteez@email.cz', href: 'mailto:nineteez@email.cz', icon: '📧' },
              { label: 'Instagram', value: '@nineteez', href: 'https://instagram.com/nineteez', icon: '📸' },
              { label: 'Bandcamp', value: 'nineteez.bandcamp.com', href: 'https://bandcamp.com', icon: '🎵' },
            ].map(c => (
              <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer"
                className="card-dark"
                style={{
                  padding: '20px 28px', borderRadius: 8, textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 12, minWidth: 180,
                }}
              >
                <span style={{ fontSize: 20 }}>{c.icon}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 10, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 2 }}>{c.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#c8a96e' }}>{c.value}</div>
                </div>
              </a>
            ))}
          </div>

          {/* Beat licensing note */}
          <div style={{
            padding: '20px 24px', borderRadius: 8,
            background: 'rgba(200,169,110,0.06)', border: '1px solid rgba(200,169,110,0.15)',
            fontSize: 13, color: '#475569', lineHeight: 1.7,
          }}>
            🎚️ <strong style={{ color: '#c8a96e' }}>Beat licensing:</strong> Nabízím exkluzivní i non-exkluzivní licence.
            Všechny beaty jsou původní produkce nahraná na Akai MPC 3000.
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{
        padding: '32px 24px',
        borderTop: '1px solid rgba(200,169,110,0.08)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16, maxWidth: 1100, margin: '0 auto',
      }}>
        <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: '3px' }}>
          <span className="gold-grad">NINETEEZ</span>
        </span>
        <span style={{ fontSize: 12, color: '#1e293b' }}>
          © {new Date().getFullYear()} · Beats made on Akai MPC 3000 · Praha
        </span>
        <div style={{ display: 'flex', gap: 20 }}>
          {[{ l: 'Story', h: 'story' }, { l: 'Projekty', h: 'projekty' }, { l: 'Kontakt', h: 'kontakt' }].map(({ l, h }) => (
            <span key={h} className="nav-link" onClick={() => scrollTo(h)}>{l}</span>
          ))}
        </div>
      </footer>
    </div>
  );
}
