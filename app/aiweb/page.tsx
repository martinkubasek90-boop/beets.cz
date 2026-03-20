'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WebGLShader } from '@/components/aiweb/webgl-shader';
import { GALLERY_ITEMS } from './examples/gallery-items';
import { Gallery4 } from '@/components/aiweb/gallery4';

/* ─── Types ─── */
type FormData = {
  name: string; email: string; phone: string;
  company: string; budget: string; message: string; gdpr: boolean;
};
type FormStatus = 'idle' | 'sending' | 'success' | 'error';

export interface AIWebContent {
  heroHeadline1: string;
  heroHeadlineAccent: string;
  heroHeadline2: string;
  heroSub: string;
  heroCta: string;
  heroTrust: string[];
  stats: { value: string; label: string }[];
  servicesTitle: string;
  servicesSub: string;
  services: { icon: string; title: string; desc: string; tags: string[] }[];
  whyTitle: string;
  whySub: string;
  whyItems: { icon: string; title: string; desc: string }[];
  processTitle: string;
  processSub: string;
  process: { step: string; icon: string; title: string; desc: string }[];
  referencesTitle: string;
  referencesSub: string;
  references: { name: string; role: string; text: string; stars: number; initials: string; color: string }[];
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  contactCity: string;
  contactCompany: string;
  contactIco: string;
}

export const DEFAULT_CONTENT: AIWebContent = {
  heroHeadline1: 'Weby, které',
  heroHeadlineAccent: 'prodávají',
  heroHeadline2: 'samy za vás',
  heroSub: 'Kombinujeme sílu umělé inteligence s designem světové třídy. Výsledkem jsou weby, které zaujmou, přesvědčí a konvertují.',
  heroCta: 'Chci svůj web',
  heroTrust: ['✓ Konzultace zdarma', '✓ 3 měsíce podpory v ceně', '✓ Výsledky nebo vrátíme peníze', '✓ Česká firma'],
  stats: [
    { value: '180+', label: 'Dokončených projektů' },
    { value: '98%', label: 'Spokojených klientů' },
    { value: '9 let', label: 'Na trhu' },
    { value: '24/7', label: 'Podpora' },
  ],
  servicesTitle: 'Digitální řešení pro výsledky',
  servicesSub: 'Každý projekt tvoříme na míru. Žádné šablony, žádné kompromisy.',
  services: [
    { icon: '⚡', title: 'AI Webové stránky', desc: 'Weby generované i optimalizované pomocí AI. Rychlejší vývoj, lepší konverze, nižší cena.', tags: ['Next.js', 'AI Design', 'SEO'] },
    { icon: '🛒', title: 'E-commerce řešení', desc: 'Výkonné e-shopy s inteligentním doporučováním produktů a automatizovaným marketingem.', tags: ['Shopify', 'WooCommerce', 'AI chat'] },
    { icon: '🎯', title: 'Landing Pages', desc: 'Konverzní stránky optimalizované pro vaše kampaně. A/B testování v reálném čase.', tags: ['PPC', 'Konverze', 'Analytics'] },
    { icon: '🔄', title: 'Redesign webu', desc: 'Transformujeme zastaralé weby v moderní, rychlé a výkonné digitální zbraně.', tags: ['UX Audit', 'Migrace', 'Optimalizace'] },
    { icon: '📊', title: 'SEO & Analytika', desc: 'AI-poháněná SEO strategie a pokročilá analytika pro maximální organický dosah.', tags: ['Google Analytics', 'Core Web Vitals', 'AI SEO'] },
    { icon: '🤖', title: 'Webové aplikace', desc: 'Složité webové aplikace a SaaS řešení s AI funkcionalitami na míru vašemu byznysu.', tags: ['React', 'API integrace', 'AI asistent'] },
  ],
  whyTitle: 'Nejsme agentura. Jsme váš digitální partner.',
  whySub: 'Zatímco ostatní agentury dodají web a zmizí, my budujeme dlouhodobé partnerství. Každý projekt bereme jako svůj vlastní byznys.',
  whyItems: [
    { icon: '⚡', title: 'Rychlost jako priorita', desc: 'Core Web Vitals score 95+ garantujeme. Pomalý web zabíjí konverze.' },
    { icon: '🤖', title: 'AI na každém kroku', desc: 'Od analýzy po SEO. Umělá inteligence zrychluje vývoj a zvyšuje přesnost.' },
    { icon: '🇨🇿', title: 'Česká podpora', desc: 'Žádné jazykové bariéry. Přímá komunikace, pochopení místního trhu.' },
    { icon: '📈', title: 'Orientace na výsledky', desc: 'Neměříme úspěch hezčím vzhledem – měříme ho vašimi tržbami a leady.' },
    { icon: '🔒', title: 'Bezpečnost & GDPR', desc: 'Všechny weby splňují GDPR. Bezpečnost dat na prvním místě.' },
    { icon: '♾️', title: 'Neomezená škálovatelnost', desc: 'Architektura navržená pro růst. Web, který zvládne tisíce návštěvníků denně.' },
  ],
  processTitle: 'Jak spolu pracujeme',
  processSub: '5 kroků k webu, který funguje',
  process: [
    { step: '01', icon: '💬', title: 'Bezplatná konzultace', desc: 'Zavoláme si nebo napíšeme. Pochopíme vaše cíle, publikum a konkurenci. Žádné závazky.' },
    { step: '02', icon: '🔍', title: 'Strategie & analýza', desc: 'AI analýza trhu, konkurence a vaší cílové skupiny. Vypracujeme přesnou strategii.' },
    { step: '03', icon: '✏️', title: 'Design & prototyp', desc: 'Unikátní design na míru vaší značce. Schválíte každý detail před vývojem.' },
    { step: '04', icon: '⚙️', title: 'Vývoj & testování', desc: 'Čistý, rychlý kód s průběžnými testy. Dostáváte přístup k preview verzím.' },
    { step: '05', icon: '🚀', title: 'Spuštění & podpora', desc: 'Spustíme web a sledujeme výkonnost. 3 měsíce podpory zdarma po každém projektu.' },
  ],
  referencesTitle: 'Co říkají naši klienti',
  referencesSub: '180+ spokojených firem a podnikatelů po celé ČR',
  references: [
    { name: 'Martin Kovář', role: 'CEO, TechFlow s.r.o.', text: 'S AIWEB jsme zvýšili konverze o 340 % za první tři měsíce. Jejich přístup je naprosto jiný než u klasických agentur – mají výsledky.', stars: 5, initials: 'MK', color: '#8b5cf6' },
    { name: 'Jana Procházková', role: 'Majitelka, Bloom Boutique', text: 'Redesign e-shopu byl hotový za 3 týdny a tržby vzrostly o 180 %. Doporučuji každému, kdo to s online prodejem myslí vážně.', stars: 5, initials: 'JP', color: '#ec4899' },
    { name: 'Petr Šimánek', role: 'Ředitel marketingu, DataStar', text: 'Jejich AI landing pages jsou na jiné úrovni. Okamžitá reakce, profesionální přístup a výsledky, které převyšují očekávání.', stars: 5, initials: 'PŠ', color: '#06b6d4' },
    { name: 'Lucie Veselá', role: 'Founder, FitLife Academy', text: 'Od startu spolupráce máme 5× více leads. Webová aplikace, kterou pro nás vytvořili, je přesně to, co jsme potřebovali.', stars: 5, initials: 'LV', color: '#f59e0b' },
  ],
  contactEmail: 'info@aiweb.cz',
  contactPhone: '+420 800 000 000',
  contactAddress: 'Václavské náměstí 1',
  contactCity: '110 00 Praha 1',
  contactCompany: 'AIWEB s.r.o.',
  contactIco: '00000000',
};

const EMPTY_FORM: FormData = { name: '', email: '', phone: '', company: '', budget: '', message: '', gdpr: false };
const NAV_LINKS = [
  { label: 'Služby', href: '#sluzby' },
  { label: 'Jak pracujeme', href: '#proces' },
  { label: 'Reference', href: '#reference' },
  { label: 'Kontakt', href: '#kontakt' },
];

export default function AIWebPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [c, setC] = useState<AIWebContent>(DEFAULT_CONTENT);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('aiweb_content');
      if (saved) setC({ ...DEFAULT_CONTENT, ...JSON.parse(saved) });
    } catch { /* ignore */ }
  }, []);

  const handleField = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending'); setErrorMsg('');
    try {
      const res = await fetch('/api/aiweb-contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Chyba při odesílání.'); setStatus('error'); }
      else { setStatus('success'); setForm(EMPTY_FORM); }
    } catch { setErrorMsg('Chyba připojení. Zkuste to prosím znovu.'); setStatus('error'); }
  };

  const getReferenceHeadline = (role: string) => {
    const company = role.split(',').slice(1).join(',').trim();
    return company || role;
  };

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id.replace('#', ''))?.scrollIntoView({ behavior: 'smooth' });
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 15,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(167,139,250,0.2)',
    color: '#e2e8f0', boxSizing: 'border-box' as const, transition: 'border-color 0.2s',
  };

  return (
    <div style={{ background: '#04050f', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)' }}>
      <WebGLShader />
      <style>{`
        @keyframes orbFloat { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-50px) scale(1.08)} 66%{transform:translate(-30px,30px) scale(0.94)} }
        @keyframes orbFloat2 { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(-60px,40px) scale(1.12)} 70%{transform:translate(30px,-20px) scale(0.9)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes gradShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes pulse-glow { 0%,100%{box-shadow:0 0 20px rgba(167,139,250,0.4)} 50%{box-shadow:0 0 40px rgba(167,139,250,0.8)} }
        .anim-fade-up{animation:fadeUp 0.7s ease both}
        .anim-delay-1{animation-delay:0.1s} .anim-delay-2{animation-delay:0.22s} .anim-delay-3{animation-delay:0.34s}
        .grad-text{background:linear-gradient(135deg,#a78bfa 0%,#60a5fa 50%,#34d399 100%);background-size:200% 200%;animation:gradShift 4s ease infinite;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .card-glow{transition:all 0.3s ease}
        .card-glow:hover{box-shadow:0 0 0 1px rgba(167,139,250,0.3),0 20px 60px rgba(167,139,250,0.08);transform:translateY(-4px)}
        .btn-primary{background:linear-gradient(135deg,#7c3aed,#2563eb);transition:all 0.25s ease}
        .btn-primary:hover{background:linear-gradient(135deg,#6d28d9,#1d4ed8);transform:translateY(-2px);box-shadow:0 8px 32px rgba(124,58,237,0.5)}
        .mesh-bg{background-image:radial-gradient(circle at 1px 1px,rgba(167,139,250,0.08) 1px,transparent 0);background-size:40px 40px}
        .glass{background:rgba(255,255,255,0.03);backdrop-filter:blur(12px);border:1px solid rgba(167,139,250,0.12)}
        input,textarea,select{outline:none}
        input:focus,textarea:focus,select:focus{border-color:rgba(124,58,237,0.6)!important;box-shadow:0 0 0 3px rgba(124,58,237,0.15)}
        .star{color:#fbbf24}
        .nav-link{color:#94a3b8;transition:color 0.2s;cursor:pointer;text-decoration:none}
        .nav-link:hover{color:#e2e8f0}
        .section-label{color:#a78bfa;font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px}
        @media(max-width:768px){.desktop-nav{display:none!important}.burger-btn{display:block!important}}
      `}</style>

      {/* ─── NAV ─── */}
      <header style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, padding:'0 24px', transition:'all 0.3s', background:scrolled?'rgba(4,5,15,0.92)':'transparent', backdropFilter:scrolled?'blur(20px)':'none', borderBottom:scrolled?'1px solid rgba(167,139,250,0.1)':'1px solid transparent' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:68 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={() => window.scrollTo({ top:0, behavior:'smooth' })}>
            <div style={{ width:36, height:36, borderRadius:8, background:'linear-gradient(135deg,#7c3aed,#2563eb)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'#fff' }}>AI</div>
            <span style={{ fontSize:20, fontWeight:800, letterSpacing:'-0.5px' }}>
              <span className="grad-text">AI</span><span style={{ color:'#fff' }}>WEB</span>
            </span>
          </div>
          <nav style={{ display:'flex', alignItems:'center', gap:32 }} className="desktop-nav">
            {NAV_LINKS.map(l => <span key={l.label} className="nav-link" style={{ fontSize:14, fontWeight:500 }} onClick={() => scrollTo(l.href)}>{l.label}</span>)}
            <button className="btn-primary" onClick={() => scrollTo('#poptavka')} style={{ padding:'10px 22px', borderRadius:8, border:'none', cursor:'pointer', fontSize:14, fontWeight:600, color:'#fff' }}>Nezávazná poptávka</button>
          </nav>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ display:'none', background:'none', border:'none', cursor:'pointer', padding:8 }} className="burger-btn" aria-label="Menu">
            <div style={{ width:24, height:2, background:'#e2e8f0', marginBottom:5, borderRadius:2, transition:'all 0.3s', transform:menuOpen?'rotate(45deg) translateY(7px)':'none' }} />
            <div style={{ width:24, height:2, background:'#e2e8f0', marginBottom:5, borderRadius:2, opacity:menuOpen?0:1, transition:'all 0.3s' }} />
            <div style={{ width:24, height:2, background:'#e2e8f0', borderRadius:2, transition:'all 0.3s', transform:menuOpen?'rotate(-45deg) translateY(-7px)':'none' }} />
          </button>
        </div>
        {menuOpen && (
          <div style={{ background:'rgba(4,5,15,0.98)', borderTop:'1px solid rgba(167,139,250,0.1)', padding:'20px 24px', display:'flex', flexDirection:'column', gap:20 }}>
            {NAV_LINKS.map(l => <span key={l.label} className="nav-link" style={{ fontSize:16, fontWeight:500 }} onClick={() => scrollTo(l.href)}>{l.label}</span>)}
            <button className="btn-primary" onClick={() => scrollTo('#poptavka')} style={{ padding:'12px 22px', borderRadius:8, border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#fff', textAlign:'center' }}>Nezávazná poptávka</button>
          </div>
        )}
      </header>

      {/* ─── HERO ─── */}
      <section style={{ position:'relative', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', padding:'160px 24px 80px' }}>
        <div style={{ position:'absolute', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(124,58,237,0.18) 0%,transparent 70%)', top:'-200px', left:'-200px', pointerEvents:'none', animation:'orbFloat 14s ease-in-out infinite' }} />
        <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(37,99,235,0.15) 0%,transparent 70%)', bottom:'-150px', right:'-100px', pointerEvents:'none', animation:'orbFloat2 18s ease-in-out infinite' }} />
        <div className="mesh-bg" style={{ position:'absolute', inset:0, pointerEvents:'none' }} />
        <div style={{ position:'relative', maxWidth:860, textAlign:'center' }}>
          <h1 className="anim-fade-up anim-delay-1" style={{ fontSize:'clamp(40px,8vw,82px)', fontWeight:900, lineHeight:1.05, letterSpacing:'-2px', margin:'0 0 24px' }}>
            {c.heroHeadline1}{' '}<span className="grad-text">{c.heroHeadlineAccent}</span><br />{c.heroHeadline2}
          </h1>
          <p className="anim-fade-up anim-delay-2" style={{ fontSize:'clamp(16px,2.2vw,20px)', color:'#94a3b8', lineHeight:1.7, maxWidth:620, margin:'0 auto 40px' }}>
            {c.heroSub}
          </p>
          <div className="anim-fade-up anim-delay-3" style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' }}>
            <button className="btn-primary" onClick={() => scrollTo('#poptavka')} style={{ padding:'16px 32px', borderRadius:10, border:'none', cursor:'pointer', fontSize:16, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:8 }}>
              {c.heroCta} <span style={{ fontSize:18 }}>→</span>
            </button>
            <button onClick={() => scrollTo('#priklady')} style={{ padding:'16px 32px', borderRadius:10, cursor:'pointer', fontSize:16, fontWeight:600, color:'#e2e8f0', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)', transition:'all 0.25s' }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.background='rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.background='rgba(255,255,255,0.05)'; }}>
              Ukázky webů
            </button>
          </div>
          <div style={{ marginTop:48, display:'flex', justifyContent:'center', flexWrap:'wrap', gap:'8px 32px' }}>
            {c.heroTrust.map(t => <span key={t} style={{ color:'#64748b', fontSize:13 }}>{t}</span>)}
          </div>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section style={{ padding:'0 24px 48px' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:2, borderRadius:16, overflow:'hidden', border:'1px solid rgba(167,139,250,0.15)', background:'rgba(167,139,250,0.05)' }}>
            {c.stats.map(s => (
              <div key={s.label} style={{ padding:'28px 24px', textAlign:'center', background:'rgba(4,5,15,0.8)' }}>
                <div style={{ fontSize:'clamp(28px,4vw,40px)', fontWeight:900, marginBottom:6 }}><span className="grad-text">{s.value}</span></div>
                <div style={{ fontSize:13, color:'#64748b', fontWeight:500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SERVICES ─── */}
      <section id="sluzby" style={{ padding:'48px 24px', position:'relative' }}>
        <div className="mesh-bg" style={{ position:'absolute', inset:0, opacity:0.5, pointerEvents:'none' }} />
        <div style={{ maxWidth:1200, margin:'0 auto', position:'relative' }}>
          <div style={{ textAlign:'center', marginBottom:40 }}>
            <p className="section-label">Co děláme</p>
            <h2 style={{ fontSize:'clamp(28px,5vw,48px)', fontWeight:900, letterSpacing:'-1px', margin:'0 0 12px', color:'#f1f5f9' }}>
              {c.servicesTitle}
            </h2>
            <p style={{ color:'#64748b', fontSize:16, maxWidth:500, margin:'0 auto' }}>{c.servicesSub}</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))', gap:20 }}>
            {c.services.map(s => (
              <div key={s.title} className="card-glow glass" style={{ padding:'28px', borderRadius:16 }}>
                <div style={{ width:48, height:48, borderRadius:12, marginBottom:16, background:'linear-gradient(135deg,rgba(124,58,237,0.2),rgba(37,99,235,0.2))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, border:'1px solid rgba(167,139,250,0.2)' }}>{s.icon}</div>
                <h3 style={{ fontSize:19, fontWeight:700, marginBottom:10, color:'#f1f5f9' }}>{s.title}</h3>
                <p style={{ color:'#64748b', lineHeight:1.7, fontSize:14, marginBottom:16 }}>{s.desc}</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {s.tags.map(t => <span key={t} style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:100, background:'rgba(124,58,237,0.15)', color:'#a78bfa', border:'1px solid rgba(124,58,237,0.25)' }}>{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHY US ─── */}
      <section style={{ padding:'48px 24px', background:'rgba(7,10,26,0.6)', borderTop:'1px solid rgba(167,139,250,0.07)', borderBottom:'1px solid rgba(167,139,250,0.07)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:48, alignItems:'start' }}>
          <div>
            <p className="section-label">Proč my</p>
            <h2 style={{ fontSize:'clamp(26px,4vw,42px)', fontWeight:900, letterSpacing:'-1px', margin:'0 0 16px', lineHeight:1.15 }}>{c.whyTitle}</h2>
            <p style={{ color:'#64748b', fontSize:16, lineHeight:1.8, marginBottom:28 }}>{c.whySub}</p>
            <button className="btn-primary" onClick={() => scrollTo('#poptavka')} style={{ padding:'14px 28px', borderRadius:10, border:'none', cursor:'pointer', fontSize:15, fontWeight:600, color:'#fff' }}>Začít spolupráci →</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {c.whyItems.map(item => (
              <div key={item.title} style={{ display:'flex', gap:14, padding:'14px 18px', borderRadius:12, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(167,139,250,0.08)', transition:'border-color 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor='rgba(124,58,237,0.3)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor='rgba(167,139,250,0.08)'; }}>
                <span style={{ fontSize:20, flexShrink:0, marginTop:2 }}>{item.icon}</span>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:'#f1f5f9', marginBottom:3 }}>{item.title}</div>
                  <div style={{ fontSize:13, color:'#64748b', lineHeight:1.6 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PROCESS ─── */}
      <section id="proces" style={{ padding:'48px 24px' }}>
        <div style={{ maxWidth:760, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:36 }}>
            <p className="section-label">Jak pracujeme</p>
            <h2 style={{ fontSize:'clamp(28px,5vw,48px)', fontWeight:900, letterSpacing:'-1px', margin:'0 0 8px', color:'#f1f5f9' }}>
              {c.processTitle}
            </h2>
            <p style={{ color:'#64748b', fontSize:16, margin:0 }}>{c.processSub}</p>
          </div>
          <div style={{ display:'flex', flexDirection:'column' }}>
            {c.process.map((p, i) => (
              <div key={p.step} style={{ display:'flex', gap:20 }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                  <div style={{ width:48, height:48, borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(37,99,235,0.3))', border:'1px solid rgba(124,58,237,0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{p.icon}</div>
                  {i < c.process.length - 1 && <div style={{ width:2, flex:1, minHeight:20, background:'linear-gradient(to bottom,rgba(124,58,237,0.4),rgba(37,99,235,0.1))', margin:'3px 0' }} />}
                </div>
                <div style={{ paddingBottom:i < c.process.length - 1 ? 20 : 0, paddingTop:8 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'#7c3aed', letterSpacing:'1px' }}>KROK {p.step}</span>
                  <h3 style={{ fontSize:17, fontWeight:700, color:'#f1f5f9', margin:'4px 0 4px' }}>{p.title}</h3>
                  <p style={{ color:'#64748b', fontSize:14, lineHeight:1.6, margin:0 }}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── REFERENCES ─── */}
      <section id="reference" style={{ padding:'12px 24px 32px', background:'rgba(7,10,26,0.85)', borderTop:'1px solid rgba(167,139,250,0.07)', marginTop:-8, position:'relative', zIndex:1 }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:28 }}>
            <p className="section-label">Reference</p>
            <h2 style={{ fontSize:'clamp(28px,5vw,48px)', fontWeight:900, letterSpacing:'-1px', margin:'0 0 10px', color:'#f1f5f9' }}>
              {c.referencesTitle}
            </h2>
            <p style={{ color:'#64748b', fontSize:16, margin:0 }}>{c.referencesSub}</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:14 }}>
            {c.references.map(r => (
              <div key={r.name} className="card-glow glass" style={{ padding:20, borderRadius:16 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:r.color, letterSpacing:'1.2px', textTransform:'uppercase' }}>
                    {getReferenceHeadline(r.role)}
                  </div>
                  <div>{Array.from({length:r.stars}).map((_,i) => <span key={i} className="star" style={{ fontSize:14 }}>★</span>)}</div>
                </div>
                <p style={{ color:'#cbd5e1', fontSize:14, lineHeight:1.7, marginBottom:16, fontStyle:'italic' }}>&ldquo;{r.text}&rdquo;</p>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:40, height:40, borderRadius:'50%', flexShrink:0, background:r.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff' }}>{r.initials}</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13, color:'#f1f5f9' }}>{r.name}</div>
                    <div style={{ fontSize:12, color:'#64748b' }}>{r.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:28, textAlign:'center' }}>
            <p style={{ color:'#334155', fontSize:12, letterSpacing:'2px', textTransform:'uppercase', marginBottom:20 }}>Důvěřují nám</p>
            <div style={{ display:'flex', justifyContent:'center', flexWrap:'wrap', gap:'10px 28px' }}>
              {['TechFlow', 'Bloom Boutique', 'DataStar', 'FitLife Academy', 'Nova Media', 'SkyRocket'].map(n => (
                <span key={n} style={{ color:'#334155', fontSize:14, fontWeight:700 }}>{n}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── EXAMPLES ─── */}
      <div style={{ position:'relative' }}>
        <div className="mesh-bg" style={{ position:'absolute', opacity:0.22, inset:0, pointerEvents:'none' }} />
        <Gallery4
          id="priklady"
          title="Ukázky webů"
          description="Vyberte si styl, který je nejblíž vašemu oboru. Každá ukázka má vlastní vizuál a samostatné demo."
          items={GALLERY_ITEMS}
          ctaHref="/aiweb/ukazkywebu"
          ctaLabel="Zobrazit celý přehled webů"
        />
      </div>

      {/* ─── FORM ─── */}
      <section id="poptavka" style={{ padding:'48px 24px', position:'relative', overflow:'hidden', background:'rgba(4,5,15,0.9)', borderTop:'1px solid rgba(167,139,250,0.07)' }}>
        <div style={{ position:'absolute', width:800, height:800, borderRadius:'50%', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'radial-gradient(circle,rgba(124,58,237,0.07) 0%,transparent 65%)', pointerEvents:'none' }} />
        <div style={{ maxWidth:680, margin:'0 auto', position:'relative' }}>
          <div style={{ textAlign:'center', marginBottom:40 }}>
            <p className="section-label">Nezávazná poptávka</p>
            <h2 style={{ fontSize:'clamp(28px,5vw,48px)', fontWeight:900, letterSpacing:'-1px', margin:'0 0 12px' }}>Pojďme to <span className="grad-text">rozjet</span></h2>
            <p style={{ color:'#64748b', fontSize:16, margin:0 }}>Napište nám. Ozveme se do 24 hodin s konkrétním návrhem.</p>
          </div>
          {status === 'success' ? (
            <div style={{ padding:48, textAlign:'center', borderRadius:20, background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.3)' }}>
              <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
              <h3 style={{ fontSize:24, fontWeight:700, marginBottom:12, color:'#34d399' }}>Odesláno!</h3>
              <p style={{ color:'#64748b', fontSize:16 }}>Děkujeme za vaši poptávku. Ozveme se vám do 24 hodin.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="glass" style={{ padding:'36px', borderRadius:20 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:16, marginBottom:16 }}>
                {[
                  { name:'name', label:'Jméno a příjmení *', type:'text', placeholder:'Jan Novák', required:true },
                  { name:'email', label:'E-mail *', type:'email', placeholder:'jan@firma.cz', required:true },
                  { name:'phone', label:'Telefon', type:'tel', placeholder:'+420 600 000 000', required:false },
                  { name:'company', label:'Firma', type:'text', placeholder:'Název firmy s.r.o.', required:false },
                ].map(f => (
                  <div key={f.name}>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#94a3b8', marginBottom:6 }}>{f.label}</label>
                    <input type={f.type} name={f.name} value={(form as Record<string,unknown>)[f.name] as string} onChange={handleField} required={f.required} placeholder={f.placeholder} style={inputStyle} />
                  </div>
                ))}
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#94a3b8', marginBottom:6 }}>Orientační rozpočet</label>
                <select name="budget" value={form.budget} onChange={handleField} style={{ ...inputStyle, background:'rgba(4,5,15,0.9)', cursor:'pointer', appearance:'none' as const, color:form.budget?'#e2e8f0':'#475569' }}>
                  <option value="">Vyberte rozsah...</option>
                  {['do 30 000 Kč','30 000 – 80 000 Kč','80 000 – 200 000 Kč','200 000 – 500 000 Kč','500 000+ Kč','Zatím nevím'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#94a3b8', marginBottom:6 }}>Popište váš projekt *</label>
                <textarea name="message" value={form.message} onChange={handleField} required rows={4} placeholder="Co potřebujete vytvořit? Jaký je cíl webu?" style={{ ...inputStyle, resize:'vertical', lineHeight:1.6, fontFamily:'inherit' }} />
              </div>
              <div style={{ marginBottom:24 }}>
                <label style={{ display:'flex', alignItems:'flex-start', gap:12, cursor:'pointer' }}>
                  <input type="checkbox" name="gdpr" checked={form.gdpr} onChange={handleField} required style={{ width:18, height:18, marginTop:2, accentColor:'#7c3aed', flexShrink:0, cursor:'pointer' }} />
                  <span style={{ fontSize:13, color:'#64748b', lineHeight:1.6 }}>
                    Souhlasím se{' '}<Link href="/aiweb/gdpr" style={{ color:'#a78bfa', textDecoration:'underline' }}>zpracováním osobních údajů</Link>{' '}v souladu s GDPR. *
                  </span>
                </label>
              </div>
              {status === 'error' && errorMsg && (
                <div style={{ padding:'12px 16px', borderRadius:10, marginBottom:16, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171', fontSize:14 }}>⚠️ {errorMsg}</div>
              )}
              <button type="submit" disabled={status==='sending'} className="btn-primary" style={{ width:'100%', padding:'15px', borderRadius:10, border:'none', cursor:status==='sending'?'not-allowed':'pointer', fontSize:16, fontWeight:700, color:'#fff', opacity:status==='sending'?0.7:1 }}>
                {status==='sending'?'Odesílám...':'Odeslat poptávku →'}
              </button>
              <p style={{ textAlign:'center', color:'#334155', fontSize:12, marginTop:12 }}>🔒 Vaše data jsou v bezpečí. Používáme SSL šifrování.</p>
            </form>
          )}
        </div>
      </section>

      {/* ─── CONTACT ─── */}
      <section id="kontakt" style={{ padding:'48px 24px', background:'rgba(7,10,26,0.85)', borderTop:'1px solid rgba(167,139,250,0.07)' }}>
        <div style={{ maxWidth:1000, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:40 }}>
            <p className="section-label">Kontakt</p>
            <h2 style={{ fontSize:'clamp(28px,4vw,44px)', fontWeight:900, letterSpacing:'-1px', margin:0 }}>Jsme tu pro vás</h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:20 }}>
            {[
              { icon:'📧', label:'E-mail', value:c.contactEmail, sub:'Odpovídáme do 24 h', href:`mailto:${c.contactEmail}` },
              { icon:'📞', label:'Telefon', value:c.contactPhone, sub:'Po–Pá 9:00–18:00', href:`tel:${c.contactPhone.replace(/\s/g,'')}` },
              { icon:'📍', label:'Adresa', value:c.contactAddress, sub:c.contactCity, href:null },
              { icon:'🏢', label:'Fakturační údaje', value:c.contactCompany, sub:`IČO: ${c.contactIco}`, href:null },
            ].map(ct => (
              <div key={ct.label} className="card-glow glass" style={{ padding:24, borderRadius:16, textAlign:'center' }}>
                <div style={{ fontSize:28, marginBottom:10 }}>{ct.icon}</div>
                <div style={{ fontSize:11, fontWeight:600, color:'#475569', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:6 }}>{ct.label}</div>
                {ct.href
                  ? <a href={ct.href} style={{ fontSize:14, fontWeight:700, color:'#e2e8f0', display:'block', marginBottom:4, textDecoration:'none' }} onMouseEnter={e=>{(e.target as HTMLAnchorElement).style.color='#a78bfa'}} onMouseLeave={e=>{(e.target as HTMLAnchorElement).style.color='#e2e8f0'}}>{ct.value}</a>
                  : <div style={{ fontSize:14, fontWeight:700, color:'#e2e8f0', marginBottom:4 }}>{ct.value}</div>}
                <div style={{ fontSize:12, color:'#475569' }}>{ct.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ padding:'40px 24px 28px', borderTop:'1px solid rgba(167,139,250,0.1)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:28, marginBottom:32 }}>
            <div style={{ maxWidth:280 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#7c3aed,#2563eb)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff' }}>AI</div>
                <span style={{ fontSize:18, fontWeight:800, letterSpacing:'-0.5px' }}><span className="grad-text">AI</span><span style={{ color:'#fff' }}>WEB</span></span>
              </div>
              <p style={{ color:'#334155', fontSize:13, lineHeight:1.7, margin:0 }}>Weby nové generace pro český trh. Moderní design, AI technologie, reálné výsledky.</p>
            </div>
            <div style={{ display:'flex', gap:48, flexWrap:'wrap' }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'#475569', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:14 }}>Navigace</div>
                {NAV_LINKS.map(l => <div key={l.label} style={{ marginBottom:8 }}><span className="nav-link" style={{ fontSize:14 }} onClick={() => scrollTo(l.href)}>{l.label}</span></div>)}
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'#475569', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:14 }}>Právní</div>
                {[{ label:'GDPR & Soukromí', href:'/aiweb/gdpr' },{ label:'Obchodní podmínky', href:'/aiweb/podminky' },{ label:'Cookies', href:'/aiweb/cookies' }].map(l => (
                  <div key={l.label} style={{ marginBottom:8 }}>
                    <Link href={l.href} style={{ color:'#64748b', fontSize:14, textDecoration:'none' }} onMouseEnter={e=>{(e.target as HTMLAnchorElement).style.color='#e2e8f0'}} onMouseLeave={e=>{(e.target as HTMLAnchorElement).style.color='#64748b'}}>{l.label}</Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ paddingTop:20, borderTop:'1px solid rgba(167,139,250,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
            <p style={{ color:'#1e293b', fontSize:12, margin:0 }}>© {new Date().getFullYear()} {c.contactCompany}. Všechna práva vyhrazena.</p>
            <p style={{ color:'#1e293b', fontSize:12, margin:0 }}>Vytvořeno s ❤️ v Praze</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
