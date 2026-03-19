'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DEFAULT_CONTENT, type AIWebContent } from '../page';

const ADMIN_PASSWORD = 'aiweb2025'; // ← změň heslo zde
type Tab = 'hero' | 'stats' | 'services' | 'process' | 'references' | 'contact';

/* ─── Helpers ─── */
const inputStyle = (full = false): React.CSSProperties => ({
  width: full ? '100%' : 'auto',
  padding: '8px 12px', borderRadius: 8, fontSize: 14,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(167,139,250,0.2)',
  color: '#e2e8f0', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
  transition: 'border-color 0.2s',
});
const Label = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>{children}</div>
);
const Card = ({ children, title }: { children: React.ReactNode; title?: string }) => (
  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(167,139,250,0.12)', borderRadius: 12, padding: '20px', marginBottom: 16 }}>
    {title && <div style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', marginBottom: 16 }}>{title}</div>}
    {children}
  </div>
);

/* ─── TABS ─── */
const TABS: { id: Tab; label: string }[] = [
  { id: 'hero', label: 'Hero' },
  { id: 'stats', label: 'Statistiky' },
  { id: 'services', label: 'Služby' },
  { id: 'process', label: 'Proces' },
  { id: 'references', label: 'Reference' },
  { id: 'contact', label: 'Kontakt' },
];

export default function AIWebAdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);
  const [tab, setTab] = useState<Tab>('hero');
  const [content, setContent] = useState<AIWebContent>(DEFAULT_CONTENT);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('aiweb_admin') === '1') setAuthed(true);
    try {
      const s = localStorage.getItem('aiweb_content');
      if (s) setContent({ ...DEFAULT_CONTENT, ...JSON.parse(s) });
    } catch { /* ignore */ }
  }, []);

  const login = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); sessionStorage.setItem('aiweb_admin', '1'); }
    else { setPwError(true); setTimeout(() => setPwError(false), 2000); }
  };

  const save = () => {
    localStorage.setItem('aiweb_content', JSON.stringify(content));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const reset = () => {
    if (!confirm('Opravdu resetovat vše na výchozí hodnoty?')) return;
    localStorage.removeItem('aiweb_content');
    setContent(DEFAULT_CONTENT);
  };

  const setField = (path: string, value: unknown) => {
    setContent(prev => {
      const next = { ...prev };
      const keys = path.split('.');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let obj: any = next;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = Array.isArray(obj[keys[i]]) ? [...obj[keys[i]]] : { ...obj[keys[i]] };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const setArrayItem = <T,>(arr: T[], index: number, updater: (item: T) => T): T[] =>
    arr.map((item, i) => i === index ? updater(item) : item);

  /* ─── PASSWORD GATE ─── */
  if (!authed) return (
    <div style={{ background: '#04050f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)' }}>
      <div style={{ width: 360, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 20px' }}>🔐</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#f1f5f9', marginBottom: 8 }}>Admin přístup</h1>
        <p style={{ color: '#475569', fontSize: 14, marginBottom: 28 }}>AIWEB.CZ – správa obsahu</p>
        <input
          type="password" value={pw} onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="Heslo"
          style={{ ...inputStyle(true), padding: '13px 16px', fontSize: 16, marginBottom: 12, border: `1px solid ${pwError ? 'rgba(239,68,68,0.6)' : 'rgba(167,139,250,0.2)'}` }}
          autoFocus
        />
        {pwError && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 8 }}>Špatné heslo</p>}
        <button onClick={login} style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#7c3aed,#2563eb)' }}>
          Přihlásit se
        </button>
        <Link href="/aiweb" style={{ display: 'block', marginTop: 20, color: '#475569', fontSize: 13, textDecoration: 'none' }}>← Zpět na stránku</Link>
      </div>
    </div>
  );

  /* ─── ADMIN UI ─── */
  return (
    <div style={{ background: '#04050f', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)' }}>
      <style>{`
        input:focus, textarea:focus { border-color: rgba(124,58,237,0.6) !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.12); }
        .tab-btn { cursor:pointer; padding:8px 16px; border-radius:8px; border:none; font-size:13px; font-weight:600; transition:all 0.2s; }
        .tab-active { background:rgba(124,58,237,0.25); color:#a78bfa; }
        .tab-inactive { background:transparent; color:#475569; }
        .tab-inactive:hover { color:#94a3b8; background:rgba(255,255,255,0.04); }
      `}</style>

      {/* Top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(4,5,15,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(167,139,250,0.1)', padding: '0 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>AI</div>
            <span style={{ fontWeight: 800, fontSize: 16 }}>AIWEB <span style={{ color: '#475569', fontWeight: 400 }}>/ Admin</span></span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={reset} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Reset
            </button>
            <Link href="/aiweb" target="_blank" style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(167,139,250,0.2)', background: 'transparent', color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
              Náhled ↗
            </Link>
            <button onClick={save} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: saved ? 'rgba(52,211,153,0.2)' : 'linear-gradient(135deg,#7c3aed,#2563eb)', color: saved ? '#34d399' : '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.3s', border: saved ? '1px solid rgba(52,211,153,0.4)' : 'none' } as React.CSSProperties}>
              {saved ? '✓ Uloženo' : 'Uložit změny'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: 12, border: '1px solid rgba(167,139,250,0.1)' }}>
          {TABS.map(t => (
            <button key={t.id} className={`tab-btn ${tab === t.id ? 'tab-active' : 'tab-inactive'}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── HERO TAB ── */}
        {tab === 'hero' && (
          <div>
            <Card title="Hlavní nadpis">
              <div style={{ display: 'grid', gap: 12 }}>
                <div><Label>Řádek 1 (před akcentem)</Label><input style={inputStyle(true)} value={content.heroHeadline1} onChange={e => setField('heroHeadline1', e.target.value)} /></div>
                <div><Label>Akcentní slovo (gradient)</Label><input style={inputStyle(true)} value={content.heroHeadlineAccent} onChange={e => setField('heroHeadlineAccent', e.target.value)} /></div>
                <div><Label>Řádek 2</Label><input style={inputStyle(true)} value={content.heroHeadline2} onChange={e => setField('heroHeadline2', e.target.value)} /></div>
              </div>
            </Card>
            <Card title="Podtext a CTA">
              <div style={{ display: 'grid', gap: 12 }}>
                <div><Label>Podtext pod nadpisem</Label><textarea style={{ ...inputStyle(true), minHeight: 80 }} value={content.heroSub} onChange={e => setField('heroSub', e.target.value)} /></div>
                <div><Label>Text CTA tlačítka</Label><input style={inputStyle(true)} value={content.heroCta} onChange={e => setField('heroCta', e.target.value)} /></div>
              </div>
            </Card>
            <Card title="Trust strip (body pod CTA)">
              {content.heroTrust.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <input style={{ ...inputStyle(true) }} value={t} onChange={e => setField('heroTrust', content.heroTrust.map((v, j) => j === i ? e.target.value : v))} />
                  <button onClick={() => setField('heroTrust', content.heroTrust.filter((_, j) => j !== i))} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer', flexShrink: 0 }}>✕</button>
                </div>
              ))}
              <button onClick={() => setField('heroTrust', [...content.heroTrust, '✓ Nová položka'])} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(167,139,250,0.2)', background: 'transparent', color: '#a78bfa', fontSize: 13, cursor: 'pointer', marginTop: 4 }}>+ Přidat</button>
            </Card>
          </div>
        )}

        {/* ── STATS TAB ── */}
        {tab === 'stats' && (
          <div>
            <p style={{ color: '#475569', fontSize: 14, marginBottom: 20 }}>4 statistiky zobrazené pod hero sekcí.</p>
            {content.stats.map((s, i) => (
              <Card key={i} title={`Statistika ${i + 1}`}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                  <div><Label>Hodnota</Label><input style={inputStyle(true)} value={s.value} onChange={e => setField('stats', setArrayItem(content.stats, i, item => ({ ...item, value: e.target.value })))} /></div>
                  <div><Label>Popis</Label><input style={inputStyle(true)} value={s.label} onChange={e => setField('stats', setArrayItem(content.stats, i, item => ({ ...item, label: e.target.value })))} /></div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── SERVICES TAB ── */}
        {tab === 'services' && (
          <div>
            <Card title="Nadpis sekce">
              <div style={{ display: 'grid', gap: 12 }}>
                <div><Label>Nadpis</Label><input style={inputStyle(true)} value={content.servicesTitle} onChange={e => setField('servicesTitle', e.target.value)} /></div>
                <div><Label>Podnadpis</Label><input style={inputStyle(true)} value={content.servicesSub} onChange={e => setField('servicesSub', e.target.value)} /></div>
              </div>
            </Card>
            {content.services.map((s, i) => (
              <Card key={i} title={`Služba ${i + 1}: ${s.title}`}>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12 }}>
                    <div><Label>Ikona (emoji)</Label><input style={inputStyle(true)} value={s.icon} onChange={e => setField('services', setArrayItem(content.services, i, item => ({ ...item, icon: e.target.value })))} /></div>
                    <div><Label>Název</Label><input style={inputStyle(true)} value={s.title} onChange={e => setField('services', setArrayItem(content.services, i, item => ({ ...item, title: e.target.value })))} /></div>
                  </div>
                  <div><Label>Popis</Label><textarea style={{ ...inputStyle(true), minHeight: 70 }} value={s.desc} onChange={e => setField('services', setArrayItem(content.services, i, item => ({ ...item, desc: e.target.value })))} /></div>
                  <div><Label>Tagy (oddělené čárkou)</Label><input style={inputStyle(true)} value={s.tags.join(', ')} onChange={e => setField('services', setArrayItem(content.services, i, item => ({ ...item, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })))} /></div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── PROCESS TAB ── */}
        {tab === 'process' && (
          <div>
            <Card title="Nadpis sekce">
              <div style={{ display: 'grid', gap: 12 }}>
                <div><Label>Hlavní nadpis</Label><input style={inputStyle(true)} value={content.processTitle} onChange={e => setField('processTitle', e.target.value)} /></div>
                <div><Label>Podnadpis</Label><input style={inputStyle(true)} value={content.processSub} onChange={e => setField('processSub', e.target.value)} /></div>
              </div>
            </Card>
            {content.process.map((p, i) => (
              <Card key={i} title={`Krok ${p.step}: ${p.title}`}>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12 }}>
                    <div><Label>Ikona (emoji)</Label><input style={inputStyle(true)} value={p.icon} onChange={e => setField('process', setArrayItem(content.process, i, item => ({ ...item, icon: e.target.value })))} /></div>
                    <div><Label>Název kroku</Label><input style={inputStyle(true)} value={p.title} onChange={e => setField('process', setArrayItem(content.process, i, item => ({ ...item, title: e.target.value })))} /></div>
                  </div>
                  <div><Label>Popis</Label><textarea style={{ ...inputStyle(true), minHeight: 70 }} value={p.desc} onChange={e => setField('process', setArrayItem(content.process, i, item => ({ ...item, desc: e.target.value })))} /></div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── REFERENCES TAB ── */}
        {tab === 'references' && (
          <div>
            <Card title="Nadpis sekce">
              <div style={{ display: 'grid', gap: 12 }}>
                <div><Label>Hlavní nadpis</Label><input style={inputStyle(true)} value={content.referencesTitle} onChange={e => setField('referencesTitle', e.target.value)} /></div>
                <div><Label>Podnadpis</Label><input style={inputStyle(true)} value={content.referencesSub} onChange={e => setField('referencesSub', e.target.value)} /></div>
              </div>
            </Card>
            {content.references.map((r, i) => (
              <Card key={i} title={`Hodnocení: ${r.name}`}>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><Label>Jméno</Label><input style={inputStyle(true)} value={r.name} onChange={e => setField('references', setArrayItem(content.references, i, item => ({ ...item, name: e.target.value })))} /></div>
                    <div><Label>Role / firma</Label><input style={inputStyle(true)} value={r.role} onChange={e => setField('references', setArrayItem(content.references, i, item => ({ ...item, role: e.target.value })))} /></div>
                  </div>
                  <div><Label>Text hodnocení</Label><textarea style={{ ...inputStyle(true), minHeight: 90 }} value={r.text} onChange={e => setField('references', setArrayItem(content.references, i, item => ({ ...item, text: e.target.value })))} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 80px 1fr', gap: 12 }}>
                    <div><Label>Iniciály</Label><input style={inputStyle(true)} value={r.initials} onChange={e => setField('references', setArrayItem(content.references, i, item => ({ ...item, initials: e.target.value })))} /></div>
                    <div><Label>Hvězdy (1-5)</Label><input type="number" min={1} max={5} style={inputStyle(true)} value={r.stars} onChange={e => setField('references', setArrayItem(content.references, i, item => ({ ...item, stars: Number(e.target.value) })))} /></div>
                    <div>
                      <Label>Barva avataru</Label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="color" value={r.color} onChange={e => setField('references', setArrayItem(content.references, i, item => ({ ...item, color: e.target.value })))} style={{ width: 40, height: 36, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'none', padding: 2 }} />
                        <input style={{ ...inputStyle(true), flex: 1 }} value={r.color} onChange={e => setField('references', setArrayItem(content.references, i, item => ({ ...item, color: e.target.value })))} />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            <button onClick={() => setField('references', [...content.references, { name: 'Nový klient', role: 'Role, Firma', text: 'Text hodnocení...', stars: 5, initials: 'NK', color: '#8b5cf6' }])}
              style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid rgba(167,139,250,0.2)', background: 'transparent', color: '#a78bfa', fontSize: 13, cursor: 'pointer' }}>
              + Přidat hodnocení
            </button>
          </div>
        )}

        {/* ── CONTACT TAB ── */}
        {tab === 'contact' && (
          <div>
            <Card title="Kontaktní údaje">
              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  { field: 'contactEmail', label: 'E-mail', placeholder: 'info@aiweb.cz' },
                  { field: 'contactPhone', label: 'Telefon', placeholder: '+420 800 000 000' },
                  { field: 'contactAddress', label: 'Adresa (ulice)', placeholder: 'Václavské náměstí 1' },
                  { field: 'contactCity', label: 'Město / PSČ', placeholder: '110 00 Praha 1' },
                ].map(f => (
                  <div key={f.field}>
                    <Label>{f.label}</Label>
                    <input style={inputStyle(true)} value={(content as Record<string,unknown>)[f.field] as string} placeholder={f.placeholder} onChange={e => setField(f.field, e.target.value)} />
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Fakturační údaje">
              <div style={{ display: 'grid', gap: 12 }}>
                <div><Label>Název firmy</Label><input style={inputStyle(true)} value={content.contactCompany} onChange={e => setField('contactCompany', e.target.value)} /></div>
                <div><Label>IČO</Label><input style={inputStyle(true)} value={content.contactIco} onChange={e => setField('contactIco', e.target.value)} /></div>
              </div>
            </Card>
          </div>
        )}

        {/* Bottom save bar */}
        <div style={{ marginTop: 32, padding: '16px 20px', borderRadius: 12, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
            💾 Změny se ukládají do prohlížeče (localStorage). Funguje okamžitě bez nutnosti nasazení.
          </p>
          <button onClick={save} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: saved ? 'rgba(52,211,153,0.2)' : 'linear-gradient(135deg,#7c3aed,#2563eb)', color: saved ? '#34d399' : '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', border: saved ? '1px solid rgba(52,211,153,0.4)' : 'none', transition: 'all 0.3s' } as React.CSSProperties}>
            {saved ? '✓ Uloženo!' : 'Uložit změny'}
          </button>
        </div>
      </div>
    </div>
  );
}
