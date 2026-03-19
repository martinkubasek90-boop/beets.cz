'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { WebGLShader } from '@/components/aiweb/webgl-shader';

/* ─── Types ─── */
type FormData = {
  name: string;
  email: string;
  phone: string;
  company: string;
  budget: string;
  message: string;
  gdpr: boolean;
};
type FormStatus = 'idle' | 'sending' | 'success' | 'error';

/* ─── Data ─── */
const NAV_LINKS = [
  { label: 'Služby', href: '#sluzby' },
  { label: 'Jak pracujeme', href: '#proces' },
  { label: 'Reference', href: '#reference' },
  { label: 'Kontakt', href: '#kontakt' },
];

const STATS = [
  { value: '180+', label: 'Dokončených projektů' },
  { value: '98%', label: 'Spokojených klientů' },
  { value: '9 let', label: 'Na trhu' },
  { value: '24/7', label: 'Podpora' },
];

const SERVICES = [
  {
    icon: '⚡',
    title: 'AI Webové stránky',
    desc: 'Weby generované i optimalizované pomocí AI. Rychlejší vývoj, lepší konverze, nižší cena.',
    tags: ['Next.js', 'AI Design', 'SEO'],
    gradient: 'from-violet-600 to-indigo-600',
  },
  {
    icon: '🛒',
    title: 'E-commerce řešení',
    desc: 'Výkonné e-shopy s inteligentním doporučováním produktů a automatizovaným marketingem.',
    tags: ['Shopify', 'WooCommerce', 'AI chat'],
    gradient: 'from-blue-600 to-cyan-500',
  },
  {
    icon: '🎯',
    title: 'Landing Pages',
    desc: 'Konverzní stránky optimalizované pro vaše kampaně. A/B testování v reálném čase.',
    tags: ['PPC', 'Konverze', 'Analytics'],
    gradient: 'from-cyan-500 to-teal-500',
  },
  {
    icon: '🔄',
    title: 'Redesign webu',
    desc: 'Transformujeme zastaralé weby v moderní, rychlé a výkonné digitální zbraně.',
    tags: ['UX Audit', 'Migrace', 'Optimalizace'],
    gradient: 'from-fuchsia-600 to-pink-600',
  },
  {
    icon: '📊',
    title: 'SEO & Analytika',
    desc: 'AI-poháněná SEO strategie a pokročilá analytika pro maximální organický dosah.',
    tags: ['Google Analytics', 'Core Web Vitals', 'AI SEO'],
    gradient: 'from-orange-500 to-amber-500',
  },
  {
    icon: '🤖',
    title: 'Webové aplikace',
    desc: 'Složité webové aplikace a SaaS řešení s AI funkcionalitami na míru vašemu byznysu.',
    tags: ['React', 'API integrace', 'AI asistent'],
    gradient: 'from-indigo-600 to-violet-600',
  },
];

const PROCESS = [
  {
    step: '01',
    title: 'Bezplatná konzultace',
    desc: 'Zavoláme si nebo napíšeme. Pochopíme vaše cíle, publikum a konkurenci. Žádné závazky.',
    icon: '💬',
  },
  {
    step: '02',
    title: 'Strategie & analýza',
    desc: 'AI analýza trhu, konkurence a vaší cílové skupiny. Vypracujeme přesnou strategii.',
    icon: '🔍',
  },
  {
    step: '03',
    title: 'Design & prototyp',
    desc: 'Unikátní design na míru vaší značce. Schválíte každý detail před vývojem.',
    icon: '✏️',
  },
  {
    step: '04',
    title: 'Vývoj & testování',
    desc: 'Čistý, rychlý kód s průběžnými testy. Dostáváte přístup k preview verzím.',
    icon: '⚙️',
  },
  {
    step: '05',
    title: 'Spuštění & podpora',
    desc: 'Spustíme web a sledujeme výkonnost. 3 měsíce podpory zdarma po každém projektu.',
    icon: '🚀',
  },
];

const REFERENCES = [
  {
    name: 'Martin Kovář',
    role: 'CEO, TechFlow s.r.o.',
    text: 'S AIWEB jsme zvýšili konverze o 340 % za první tři měsíce. Jejich přístup je naprosto jiný než u klasických agentur – mají výsledky.',
    stars: 5,
    initials: 'MK',
    gradient: 'from-violet-500 to-blue-500',
  },
  {
    name: 'Jana Procházková',
    role: 'Majitelka, Bloom Boutique',
    text: 'Redesign e-shopu byl hotový za 3 týdny a tržby vzrostly o 180 %. Doporučuji každému, kdo to s online prodejem myslí vážně.',
    stars: 5,
    initials: 'JP',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    name: 'Petr Šimánek',
    role: 'Ředitel marketingu, DataStar',
    text: 'Jejich AI landing pages jsou na jiné úrovni. Okamžitá reakce, profesionální přístup a výsledky, které převyšují očekávání.',
    stars: 5,
    initials: 'PŠ',
    gradient: 'from-cyan-500 to-teal-500',
  },
  {
    name: 'Lucie Veselá',
    role: 'Founder, FitLife Academy',
    text: 'Od startu spolupráce máme 5× více leads. Webová aplikace, kterou pro nás vytvořili, je přesně to, co jsme potřebovali.',
    stars: 5,
    initials: 'LV',
    gradient: 'from-amber-500 to-orange-500',
  },
];

const EMPTY_FORM: FormData = {
  name: '',
  email: '',
  phone: '',
  company: '',
  budget: '',
  message: '',
  gdpr: false,
};

/* ─── Component ─── */
export default function AIWebPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleField = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');
    try {
      const res = await fetch('/api/aiweb-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Chyba při odesílání.');
        setStatus('error');
      } else {
        setStatus('success');
        setForm(EMPTY_FORM);
      }
    } catch {
      setErrorMsg('Chyba připojení. Zkuste to prosím znovu.');
      setStatus('error');
    }
  };

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    const el = document.getElementById(id.replace('#', ''));
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ background: '#04050f', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)' }}>
      <WebGLShader />
      <style>{`
        @keyframes orbFloat {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(40px,-50px) scale(1.08); }
          66% { transform: translate(-30px,30px) scale(0.94); }
        }
        @keyframes orbFloat2 {
          0%,100% { transform: translate(0,0) scale(1); }
          40% { transform: translate(-60px,40px) scale(1.12); }
          70% { transform: translate(30px,-20px) scale(0.9); }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(24px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes gradShift {
          0%,100% { background-position: 0% 50%; }
          50%     { background-position: 100% 50%; }
        }
        @keyframes pulse-glow {
          0%,100% { box-shadow: 0 0 20px rgba(167,139,250,0.4); }
          50%     { box-shadow: 0 0 40px rgba(167,139,250,0.8); }
        }
        .anim-fade-up { animation: fadeUp 0.7s ease both; }
        .anim-delay-1 { animation-delay: 0.1s; }
        .anim-delay-2 { animation-delay: 0.22s; }
        .anim-delay-3 { animation-delay: 0.34s; }
        .grad-text {
          background: linear-gradient(135deg, #a78bfa 0%, #60a5fa 50%, #34d399 100%);
          background-size: 200% 200%;
          animation: gradShift 4s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .card-glow:hover {
          box-shadow: 0 0 0 1px rgba(167,139,250,0.3), 0 20px 60px rgba(167,139,250,0.08);
          transform: translateY(-4px);
        }
        .card-glow { transition: all 0.3s ease; }
        .btn-primary {
          background: linear-gradient(135deg, #7c3aed, #2563eb);
          transition: all 0.25s ease;
        }
        .btn-primary:hover {
          background: linear-gradient(135deg, #6d28d9, #1d4ed8);
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(124,58,237,0.5);
        }
        .process-line::after {
          content:'';
          position:absolute;
          left:50%;
          top:100%;
          height:60px;
          width:2px;
          background: linear-gradient(to bottom, rgba(124,58,237,0.5), transparent);
          transform:translateX(-50%);
        }
        @media (max-width:768px) { .process-line::after { display:none; } }
        .mesh-bg {
          background-image: radial-gradient(circle at 1px 1px, rgba(167,139,250,0.08) 1px, transparent 0);
          background-size: 40px 40px;
        }
        .glass {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(167,139,250,0.12);
        }
        input, textarea, select {
          outline: none;
        }
        input:focus, textarea:focus, select:focus {
          border-color: rgba(124,58,237,0.6) !important;
          box-shadow: 0 0 0 3px rgba(124,58,237,0.15);
        }
        .star { color: #fbbf24; }
        .nav-link {
          color: #94a3b8;
          transition: color 0.2s;
          cursor: pointer;
          text-decoration: none;
        }
        .nav-link:hover { color: #e2e8f0; }
      `}</style>

      {/* ─── NAVIGATION ─── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 24px',
        transition: 'all 0.3s',
        background: scrolled ? 'rgba(4,5,15,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(167,139,250,0.1)' : '1px solid transparent',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: '#fff'
            }}>AI</div>
            <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>
              <span className="grad-text">AI</span>
              <span style={{ color: '#fff' }}>WEB</span>
            </span>
          </div>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="desktop-nav">
            {NAV_LINKS.map((l) => (
              <span key={l.label} className="nav-link" style={{ fontSize: 14, fontWeight: 500 }} onClick={() => scrollTo(l.href)}>
                {l.label}
              </span>
            ))}
            <button className="btn-primary" onClick={() => scrollTo('#poptavka')} style={{
              padding: '10px 22px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, color: '#fff',
            }}>
              Nezávazná poptávka
            </button>
          </nav>

          {/* Mobile burger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}
            className="burger-btn"
            aria-label="Menu"
          >
            <div style={{ width: 24, height: 2, background: '#e2e8f0', marginBottom: 5, borderRadius: 2, transition: 'all 0.3s', transform: menuOpen ? 'rotate(45deg) translateY(7px)' : 'none' }} />
            <div style={{ width: 24, height: 2, background: '#e2e8f0', marginBottom: 5, borderRadius: 2, opacity: menuOpen ? 0 : 1, transition: 'all 0.3s' }} />
            <div style={{ width: 24, height: 2, background: '#e2e8f0', borderRadius: 2, transition: 'all 0.3s', transform: menuOpen ? 'rotate(-45deg) translateY(-7px)' : 'none' }} />
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{
            background: 'rgba(4,5,15,0.98)', borderTop: '1px solid rgba(167,139,250,0.1)',
            padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20,
          }}>
            {NAV_LINKS.map((l) => (
              <span key={l.label} className="nav-link" style={{ fontSize: 16, fontWeight: 500 }} onClick={() => scrollTo(l.href)}>
                {l.label}
              </span>
            ))}
            <button className="btn-primary" onClick={() => scrollTo('#poptavka')} style={{
              padding: '12px 22px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 15, fontWeight: 600, color: '#fff', textAlign: 'center',
            }}>
              Nezávazná poptávka
            </button>
          </div>
        )}
      </header>

      {/* ─── HERO ─── */}
      <section style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px' }}>
        {/* Background orbs */}
        <div style={{
          position: 'absolute', width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)',
          top: '-200px', left: '-200px', pointerEvents: 'none',
          animation: 'orbFloat 14s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)',
          bottom: '-150px', right: '-100px', pointerEvents: 'none',
          animation: 'orbFloat2 18s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52,211,153,0.1) 0%, transparent 70%)',
          top: '40%', right: '20%', pointerEvents: 'none',
          animation: 'orbFloat 22s ease-in-out infinite reverse',
        }} />

        {/* Grid mesh */}
        <div className="mesh-bg" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 860, textAlign: 'center' }}>
          {/* Badge */}
          <div className="anim-fade-up" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
            borderRadius: 100, padding: '8px 18px', marginBottom: 32,
            fontSize: 13, fontWeight: 500, color: '#a78bfa',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa', display: 'inline-block', animation: 'pulse-glow 2s infinite' }} />
            Jednička na českém trhu v AI webech
          </div>

          {/* Headline */}
          <h1 className="anim-fade-up anim-delay-1" style={{ fontSize: 'clamp(40px, 8vw, 82px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-2px', margin: '0 0 24px' }}>
            Weby, které{' '}
            <span className="grad-text">prodávají</span>
            <br />
            samy za vás
          </h1>

          <p className="anim-fade-up anim-delay-2" style={{
            fontSize: 'clamp(16px, 2.2vw, 20px)', color: '#94a3b8', lineHeight: 1.7,
            maxWidth: 620, margin: '0 auto 40px',
          }}>
            Kombinujeme sílu umělé inteligence s designem světové třídy.
            Výsledkem jsou weby, které zaujmou, přesvědčí a konvertují.
          </p>

          {/* CTAs */}
          <div className="anim-fade-up anim-delay-3" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => scrollTo('#poptavka')} style={{
              padding: '16px 32px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 16, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              Chci svůj AI web
              <span style={{ fontSize: 18 }}>→</span>
            </button>
            <button onClick={() => scrollTo('#reference')} style={{
              padding: '16px 32px', borderRadius: 10, cursor: 'pointer',
              fontSize: 16, fontWeight: 600, color: '#e2e8f0',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
              transition: 'all 0.25s',
            }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
            >
              Prohlédnout reference
            </button>
          </div>

          {/* Trust strip */}
          <div style={{ marginTop: 64, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px 32px', color: '#475569', fontSize: 13 }}>
            {['✓ Konzultace zdarma', '✓ 3 měsíce podpory v ceně', '✓ Výsledky nebo vrátíme peníze', '✓ Česká firma'].map(t => (
              <span key={t} style={{ color: '#64748b' }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section style={{ padding: '0 24px 100px', position: 'relative' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 2, borderRadius: 16, overflow: 'hidden',
            border: '1px solid rgba(167,139,250,0.15)',
            background: 'rgba(167,139,250,0.05)',
          }}>
            {STATS.map((s) => (
              <div key={s.label} style={{
                padding: '32px 24px', textAlign: 'center',
                background: 'rgba(4,5,15,0.8)',
              }}>
                <div style={{ fontSize: 'clamp(32px, 5vw, 44px)', fontWeight: 900, marginBottom: 6 }}>
                  <span className="grad-text">{s.value}</span>
                </div>
                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SERVICES ─── */}
      <section id="sluzby" style={{ padding: '80px 24px', position: 'relative' }}>
        <div className="mesh-bg" style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ color: '#a78bfa', fontSize: 13, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>
              Co děláme
            </p>
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, letterSpacing: '-1px', margin: '0 0 16px' }}>
              Digitální řešení pro <span className="grad-text">výsledky</span>
            </h2>
            <p style={{ color: '#64748b', fontSize: 16, maxWidth: 500, margin: '0 auto' }}>
              Každý projekt tvoříme na míru. Žádné šablony, žádné kompromisy.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
            {SERVICES.map((s) => (
              <div key={s.title} className="card-glow glass" style={{ padding: '32px', borderRadius: 16 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 12, marginBottom: 20,
                  background: `linear-gradient(135deg, rgba(124,58,237,0.2), rgba(37,99,235,0.2))`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                  border: '1px solid rgba(167,139,250,0.2)',
                }}>
                  {s.icon}
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: '#f1f5f9' }}>{s.title}</h3>
                <p style={{ color: '#64748b', lineHeight: 1.7, fontSize: 14, marginBottom: 20 }}>{s.desc}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {s.tags.map((t) => (
                    <span key={t} style={{
                      fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 100,
                      background: 'rgba(124,58,237,0.15)', color: '#a78bfa',
                      border: '1px solid rgba(124,58,237,0.25)', letterSpacing: '0.5px',
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHY US ─── */}
      <section style={{ padding: '100px 24px', background: 'linear-gradient(180deg, #04050f 0%, #070a1a 50%, #04050f 100%)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 64, alignItems: 'center' }}>
          <div>
            <p style={{ color: '#a78bfa', fontSize: 13, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 16 }}>
              Proč my
            </p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-1px', margin: '0 0 20px', lineHeight: 1.15 }}>
              Nejsme agentura.<br />
              Jsme váš <span className="grad-text">digitální partner</span>.
            </h2>
            <p style={{ color: '#64748b', fontSize: 16, lineHeight: 1.8, marginBottom: 32 }}>
              Zatímco ostatní agentury dodají web a zmizí, my budujeme dlouhodobé partnerství.
              Každý projekt bereme jako svůj vlastní byznys.
            </p>
            <button className="btn-primary" onClick={() => scrollTo('#poptavka')} style={{
              padding: '14px 28px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 15, fontWeight: 600, color: '#fff',
            }}>
              Začít spolupráci →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: '⚡', title: 'Rychlost jako priorita', desc: 'Core Web Vitals score 95+ garantujeme. Pomalý web zabíjí konverze.' },
              { icon: '🤖', title: 'AI na každém kroku', desc: 'Od analýzy po SEO. Umělá inteligence zrychluje vývoj a zvyšuje přesnost.' },
              { icon: '🇨🇿', title: 'Česká podpora', desc: 'Žádné jazykové bariéry. Přímá komunikace, pochopení místního trhu.' },
              { icon: '📈', title: 'Orientace na výsledky', desc: 'Neměříme úspěch hezčím vzhledem – měříme ho vašimi tržbami a leady.' },
              { icon: '🔒', title: 'Bezpečnost & GDPR', desc: 'Všechny weby splňují GDPR. Bezpečnost dat na prvním místě.' },
              { icon: '♾️', title: 'Neomezená škálovatelnost', desc: 'Architektura navržená pro růst. Web, který zvládne tisíce návštěvníků denně.' },
            ].map((item) => (
              <div key={item.title} style={{
                display: 'flex', gap: 16, padding: '16px 20px', borderRadius: 12,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(167,139,250,0.08)',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(124,58,237,0.3)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(167,139,250,0.08)'; }}
              >
                <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{item.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9', marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PROCESS ─── */}
      <section id="proces" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <p style={{ color: '#a78bfa', fontSize: 13, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>
              Jak pracujeme
            </p>
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>
              5 kroků k webu, který <span className="grad-text">funguje</span>
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {PROCESS.map((p, i) => (
              <div key={p.step} style={{ display: 'flex', gap: 24, position: 'relative', paddingBottom: i < PROCESS.length - 1 ? 0 : 0 }}>
                {/* Line */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(37,99,235,0.3))',
                    border: '1px solid rgba(124,58,237,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22,
                  }}>
                    {p.icon}
                  </div>
                  {i < PROCESS.length - 1 && (
                    <div style={{ width: 2, flex: 1, minHeight: 40, background: 'linear-gradient(to bottom, rgba(124,58,237,0.4), rgba(37,99,235,0.1))', margin: '4px 0' }} />
                  )}
                </div>
                <div style={{ paddingBottom: i < PROCESS.length - 1 ? 40 : 0, paddingTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', letterSpacing: '1px' }}>KROK {p.step}</span>
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' }}>{p.title}</h3>
                  <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── REFERENCES ─── */}
      <section id="reference" style={{ padding: '100px 24px', background: 'rgba(7,10,26,0.8)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ color: '#a78bfa', fontSize: 13, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>
              Reference
            </p>
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, letterSpacing: '-1px', margin: '0 0 16px' }}>
              Co říkají <span className="grad-text">naši klienti</span>
            </h2>
            <p style={{ color: '#64748b', fontSize: 16, margin: 0 }}>
              180+ spokojených firem a podnikatelů po celé ČR
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {REFERENCES.map((r) => (
              <div key={r.name} className="card-glow glass" style={{ padding: 28, borderRadius: 16 }}>
                {/* Stars */}
                <div style={{ marginBottom: 16 }}>
                  {'★'.repeat(r.stars).split('').map((_, i) => (
                    <span key={i} className="star" style={{ fontSize: 16 }}>★</span>
                  ))}
                </div>
                {/* Quote */}
                <p style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.75, marginBottom: 24, fontStyle: 'italic' }}>
                  &ldquo;{r.text}&rdquo;
                </p>
                {/* Author */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${r.gradient.replace('from-', '').replace(' to-', ', ')})`.replace('violet-500', '#8b5cf6').replace('blue-500', '#3b82f6').replace('pink-500', '#ec4899').replace('rose-500', '#f43f5e').replace('cyan-500', '#06b6d4').replace('teal-500', '#14b8a6').replace('amber-500', '#f59e0b').replace('orange-500', '#f97316'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: '#fff',
                  }}>
                    {r.initials}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{r.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Logo strip */}
          <div style={{ marginTop: 64, textAlign: 'center' }}>
            <p style={{ color: '#334155', fontSize: 12, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 24 }}>
              Důvěřují nám
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '12px 32px' }}>
              {['TechFlow', 'Bloom Boutique', 'DataStar', 'FitLife Academy', 'Nova Media', 'SkyRocket'].map((name) => (
                <span key={name} style={{ color: '#334155', fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px' }}>{name}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── INQUIRY FORM ─── */}
      <section id="poptavka" style={{ padding: '100px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', width: 800, height: 800, borderRadius: '50%', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 680, margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ color: '#a78bfa', fontSize: 13, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>
              Nezávazná poptávka
            </p>
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, letterSpacing: '-1px', margin: '0 0 16px' }}>
              Pojďme to <span className="grad-text">rozjet</span>
            </h2>
            <p style={{ color: '#64748b', fontSize: 16, margin: 0 }}>
              Napište nám. Ozveme se do 24 hodin s konkrétním návrhem.
            </p>
          </div>

          {status === 'success' ? (
            <div style={{
              padding: 48, textAlign: 'center', borderRadius: 20,
              background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)',
            }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
              <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: '#34d399' }}>Odesláno!</h3>
              <p style={{ color: '#64748b', fontSize: 16 }}>Děkujeme za vaši poptávku. Ozveme se vám do 24 hodin.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="glass" style={{ padding: '40px', borderRadius: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 20 }}>
                {/* Name */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                    Jméno a příjmení *
                  </label>
                  <input
                    type="text" name="name" value={form.name} onChange={handleField} required
                    placeholder="Jan Novák"
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 15,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(167,139,250,0.2)',
                      color: '#e2e8f0', boxSizing: 'border-box', transition: 'border-color 0.2s',
                    }}
                  />
                </div>
                {/* Email */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                    E-mail *
                  </label>
                  <input
                    type="email" name="email" value={form.email} onChange={handleField} required
                    placeholder="jan@firma.cz"
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 15,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(167,139,250,0.2)',
                      color: '#e2e8f0', boxSizing: 'border-box', transition: 'border-color 0.2s',
                    }}
                  />
                </div>
                {/* Phone */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                    Telefon
                  </label>
                  <input
                    type="tel" name="phone" value={form.phone} onChange={handleField}
                    placeholder="+420 600 000 000"
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 15,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(167,139,250,0.2)',
                      color: '#e2e8f0', boxSizing: 'border-box', transition: 'border-color 0.2s',
                    }}
                  />
                </div>
                {/* Company */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                    Firma
                  </label>
                  <input
                    type="text" name="company" value={form.company} onChange={handleField}
                    placeholder="Název firmy s.r.o."
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 15,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(167,139,250,0.2)',
                      color: '#e2e8f0', boxSizing: 'border-box', transition: 'border-color 0.2s',
                    }}
                  />
                </div>
              </div>

              {/* Budget */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                  Orientační rozpočet
                </label>
                <select
                  name="budget" value={form.budget} onChange={handleField}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 15,
                    background: 'rgba(4,5,15,0.9)', border: '1px solid rgba(167,139,250,0.2)',
                    color: form.budget ? '#e2e8f0' : '#475569', boxSizing: 'border-box', cursor: 'pointer',
                    appearance: 'none',
                  }}
                >
                  <option value="">Vyberte rozsah...</option>
                  <option value="do 30 000 Kč">do 30 000 Kč</option>
                  <option value="30 000 – 80 000 Kč">30 000 – 80 000 Kč</option>
                  <option value="80 000 – 200 000 Kč">80 000 – 200 000 Kč</option>
                  <option value="200 000 – 500 000 Kč">200 000 – 500 000 Kč</option>
                  <option value="500 000+ Kč">500 000+ Kč</option>
                  <option value="Zatím nevím">Zatím nevím</option>
                </select>
              </div>

              {/* Message */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                  Popište váš projekt *
                </label>
                <textarea
                  name="message" value={form.message} onChange={handleField} required rows={5}
                  placeholder="Co potřebujete vytvořit? Jaký je cíl webu? Máte přibližnou představu o designu nebo funkcích?"
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 15, resize: 'vertical',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(167,139,250,0.2)',
                    color: '#e2e8f0', boxSizing: 'border-box', lineHeight: 1.6, transition: 'border-color 0.2s',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* GDPR */}
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox" name="gdpr" checked={form.gdpr} onChange={handleField} required
                    style={{ width: 18, height: 18, marginTop: 2, accentColor: '#7c3aed', flexShrink: 0, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                    Souhlasím se{' '}
                    <Link href="/aiweb/gdpr" style={{ color: '#a78bfa', textDecoration: 'underline' }}>
                      zpracováním osobních údajů
                    </Link>
                    {' '}v souladu s GDPR. Vaše údaje budou použity výhradně pro zpracování poptávky a nebudou předány třetím stranám. *
                  </span>
                </label>
              </div>

              {/* Error */}
              {status === 'error' && errorMsg && (
                <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 20, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 14 }}>
                  ⚠️ {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="btn-primary"
                style={{
                  width: '100%', padding: '16px', borderRadius: 10, border: 'none', cursor: status === 'sending' ? 'not-allowed' : 'pointer',
                  fontSize: 16, fontWeight: 700, color: '#fff', opacity: status === 'sending' ? 0.7 : 1,
                }}
              >
                {status === 'sending' ? 'Odesílám...' : 'Odeslat poptávku →'}
              </button>

              <p style={{ textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 16 }}>
                🔒 Vaše data jsou v bezpečí. Používáme SSL šifrování.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* ─── CONTACT ─── */}
      <section id="kontakt" style={{ padding: '80px 24px', background: 'rgba(7,10,26,0.8)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ color: '#a78bfa', fontSize: 13, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>
              Kontakt
            </p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>
              Jsme tu pro vás
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            {[
              { icon: '📧', label: 'E-mail', value: 'info@aiweb.cz', sub: 'Odpovídáme do 24 h', href: 'mailto:info@aiweb.cz' },
              { icon: '📞', label: 'Telefon', value: '+420 800 000 000', sub: 'Po–Pá 9:00–18:00', href: 'tel:+420800000000' },
              { icon: '📍', label: 'Adresa', value: 'Václavské náměstí 1', sub: '110 00 Praha 1', href: null },
              { icon: '🏢', label: 'Fakturační údaje', value: 'AIWEB s.r.o.', sub: 'IČO: 00000000', href: null },
            ].map((c) => (
              <div key={c.label} className="card-glow glass" style={{ padding: 28, borderRadius: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{c.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>{c.label}</div>
                {c.href ? (
                  <a href={c.href} style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', display: 'block', marginBottom: 4, textDecoration: 'none' }}
                  onMouseEnter={e => { (e.target as HTMLAnchorElement).style.color = '#a78bfa'; }}
                  onMouseLeave={e => { (e.target as HTMLAnchorElement).style.color = '#e2e8f0'; }}
                  >{c.value}</a>
                ) : (
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{c.value}</div>
                )}
                <div style={{ fontSize: 12, color: '#475569' }}>{c.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ padding: '48px 24px 32px', borderTop: '1px solid rgba(167,139,250,0.1)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 32, marginBottom: 40 }}>
            {/* Brand */}
            <div style={{ maxWidth: 300 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#fff'
                }}>AI</div>
                <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px' }}>
                  <span className="grad-text">AI</span>
                  <span style={{ color: '#fff' }}>WEB</span>
                </span>
              </div>
              <p style={{ color: '#334155', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                Weby nové generace pro český trh. Moderní design, AI technologie, reálné výsledky.
              </p>
            </div>

            {/* Links */}
            <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 16 }}>Navigace</div>
                {NAV_LINKS.map((l) => (
                  <div key={l.label} style={{ marginBottom: 10 }}>
                    <span className="nav-link" style={{ fontSize: 14 }} onClick={() => scrollTo(l.href)}>{l.label}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 16 }}>Právní</div>
                {[
                  { label: 'GDPR & Soukromí', href: '/aiweb/gdpr' },
                  { label: 'Obchodní podmínky', href: '/aiweb/podminky' },
                  { label: 'Cookies', href: '/aiweb/cookies' },
                ].map((l) => (
                  <div key={l.label} style={{ marginBottom: 10 }}>
                    <Link href={l.href} style={{ color: '#64748b', fontSize: 14, textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => { (e.target as HTMLAnchorElement).style.color = '#e2e8f0'; }}
                    onMouseLeave={e => { (e.target as HTMLAnchorElement).style.color = '#64748b'; }}
                    >{l.label}</Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{
            paddingTop: 24, borderTop: '1px solid rgba(167,139,250,0.06)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
          }}>
            <p style={{ color: '#1e293b', fontSize: 12, margin: 0 }}>
              © {new Date().getFullYear()} AIWEB s.r.o. Všechna práva vyhrazena.
            </p>
            <p style={{ color: '#1e293b', fontSize: 12, margin: 0 }}>
              Vytvořeno s ❤️ v Praze
            </p>
          </div>
        </div>
      </footer>

      {/* Responsive overrides */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .burger-btn { display: block !important; }
        }
      `}</style>
    </div>
  );
}
