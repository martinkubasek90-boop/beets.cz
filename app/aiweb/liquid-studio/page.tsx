'use client';

import Link from 'next/link';
import { useState } from 'react';
import { GlassButton, GlassFilter } from '@/components/aiweb/glass-ui';
import { ThemeToggle } from '@/components/aiweb/theme-toggle';

export default function LiquidStudioPage() {
  const [isDark, setIsDark] = useState(true);

  const theme = isDark
    ? {
        bg: '#090b10',
        panel: 'rgba(255,255,255,0.06)',
        text: '#f8fafc',
        muted: 'rgba(248,250,252,0.72)',
      }
    : {
        bg: '#eef1f6',
        panel: 'rgba(255,255,255,0.5)',
        text: '#121826',
        muted: 'rgba(18,24,38,0.68)',
      };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `${theme.bg} url("https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1600&q=80") center/cover`,
        color: theme.text,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: isDark ? 'rgba(9,11,16,0.62)' : 'rgba(238,241,246,0.48)' }} />
      <GlassFilter />

      <div style={{ position: 'relative', zIndex: 2, padding: '28px 36px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
          <Link href="/aiweb#priklady" style={{ textDecoration: 'none', color: theme.text, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Liquid Studio
          </Link>
          <ThemeToggle isDark={isDark} onToggle={() => setIsDark(v => !v)} />
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 2, minHeight: 'calc(100vh - 88px)', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', alignItems: 'center', gap: 40, padding: '24px 36px 60px' }}>
        <div>
          <div style={{ display: 'inline-flex', padding: '8px 16px', borderRadius: 999, background: theme.panel, backdropFilter: 'blur(12px)', marginBottom: 24, fontSize: 13, fontWeight: 700 }}>
            Brand systems · Motion identity · Editorial web
          </div>
          <h1 style={{ fontSize: 'clamp(52px, 8vw, 112px)', lineHeight: 0.92, letterSpacing: '-0.07em', margin: '0 0 18px', fontWeight: 900 }}>
            Studio,
            <br />
            které míchá
            <br />
            obraz a rytmus.
          </h1>
          <p style={{ maxWidth: 620, fontSize: 18, lineHeight: 1.8, color: theme.muted, marginBottom: 30 }}>
            Nový experimentální demo web pro klienty, kteří chtějí vizuál s charakterem. Skleněná CTA, přepínání světla a tmy a layout postavený víc na atmosféře než na šabloně.
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <GlassButton>
              <span style={{ fontSize: 18, fontWeight: 700 }}>Zobrazit portfolio</span>
            </GlassButton>
            <GlassButton>
              <span style={{ fontSize: 18, fontWeight: 700 }}>Domluvit call</span>
            </GlassButton>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 18 }}>
          {[
            'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
            'https://images.unsplash.com/photo-1517142089942-ba376ce32a2e?auto=format&fit=crop&w=900&q=80',
            'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80',
          ].map((src, index) => (
            <div key={src} style={{ marginLeft: index === 1 ? 48 : 0, marginRight: index === 2 ? 52 : 0, borderRadius: 28, overflow: 'hidden', background: theme.panel, padding: 10, backdropFilter: 'blur(10px)' }}>
              <img src={src} alt={`Liquid studio showcase ${index + 1}`} style={{ width: '100%', height: index === 0 ? 240 : 180, objectFit: 'cover', display: 'block', borderRadius: 20 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
