'use client';

import Link from 'next/link';

export default function AIWebGDPRPage() {
  return (
    <div style={{ background: '#04050f', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)', padding: '80px 24px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Back */}
        <Link href="/aiweb" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#a78bfa', fontSize: 14, textDecoration: 'none', marginBottom: 40 }}>
          ← Zpět na hlavní stránku
        </Link>

        <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: 8 }}>
          Zpracování osobních údajů
        </h1>
        <p style={{ color: '#475569', fontSize: 14, marginBottom: 48 }}>
          Platné od 1. 1. 2025 | AIWEB s.r.o.
        </p>

        {[
          {
            title: '1. Správce osobních údajů',
            content: `Správcem osobních údajů je společnost AIWEB s.r.o., IČO: 00000000, se sídlem Václavské náměstí 1, 110 00 Praha 1 (dále jen „správce"). Kontaktní e-mail: gdpr@aiweb.cz`,
          },
          {
            title: '2. Jaké osobní údaje zpracováváme',
            content: `Při vyplnění poptávkového formuláře zpracováváme následující osobní údaje:\n\n• Jméno a příjmení\n• E-mailová adresa\n• Telefonní číslo (nepovinné)\n• Název firmy (nepovinné)\n• Obsah zprávy/poptávky\n\nTyto údaje jsou poskytovány dobrovolně za účelem komunikace a zpracování vaší poptávky.`,
          },
          {
            title: '3. Účel a právní základ zpracování',
            content: `Vaše osobní údaje zpracováváme za těmito účely:\n\n• Odpověď na vaši poptávku a navázání obchodní komunikace (právní základ: oprávněný zájem správce, čl. 6 odst. 1 písm. f) GDPR)\n• Uzavření a plnění smlouvy (právní základ: čl. 6 odst. 1 písm. b) GDPR)\n• Zasílání obchodních sdělení – pouze s vaším souhlasem (právní základ: čl. 6 odst. 1 písm. a) GDPR)`,
          },
          {
            title: '4. Doba uchovávání',
            content: `Osobní údaje z poptávkových formulářů uchováváme po dobu 3 let od jejich poskytnutí, nebo po dobu trvání smluvního vztahu. Po uplynutí této doby jsou údaje bezpečně vymazány.`,
          },
          {
            title: '5. Příjemci osobních údajů',
            content: `Vaše osobní údaje nepředáváme třetím stranám za účelem marketingu ani jiných komerčních účelů. Údaje mohou být předány pouze:\n\n• Zpracovatelům zajišťujícím technický provoz (hosting, e-mailové servery) – vázáni mlčenlivostí a smlouvou o zpracování\n• Orgánům veřejné moci na základě zákonné povinnosti`,
          },
          {
            title: '6. Přenos mimo EU',
            content: `Vaše osobní údaje zpracováváme výhradně v rámci Evropského hospodářského prostoru (EHP). V případě, že by bylo nezbytné přenést údaje do třetí země, bude zajištěna odpovídající úroveň ochrany v souladu s nařízením GDPR.`,
          },
          {
            title: '7. Vaše práva',
            content: `Jako subjekt údajů máte následující práva:\n\n• Právo na přístup – máte právo získat potvrzení, zda zpracováváme vaše osobní údaje\n• Právo na opravu – právo na opravu nepřesných nebo doplnění neúplných údajů\n• Právo na výmaz (právo být zapomenut) – za podmínek stanovených GDPR\n• Právo na omezení zpracování\n• Právo na přenositelnost údajů\n• Právo vznést námitku proti zpracování\n• Právo odvolat souhlas – kdykoli, bez vlivu na zákonnost zpracování před odvoláním\n\nPro uplatnění práv kontaktujte: gdpr@aiweb.cz`,
          },
          {
            title: '8. Právo podat stížnost',
            content: `Máte právo podat stížnost u dozorového úřadu, kterým je Úřad pro ochranu osobních údajů (ÚOOÚ), Pplk. Sochora 27, 170 00 Praha 7, www.uoou.cz.`,
          },
          {
            title: '9. Cookies',
            content: `Naše webové stránky používají soubory cookies pro zajištění správné funkčnosti webu a analýzu návštěvnosti (Google Analytics). Podrobnosti o používání cookies naleznete v naší Cookie politice. Cookies nepotřebné pro funkčnost webu jsou instalovány pouze s vaším souhlasem.`,
          },
          {
            title: '10. Zabezpečení',
            content: `Přijímáme veškerá přiměřená technická a organizační opatření k ochraně vašich osobních údajů před neoprávněným přístupem, ztrátou nebo zneužitím. Veškerá komunikace je šifrována prostřednictvím SSL/TLS protokolu.`,
          },
        ].map((section) => (
          <div key={section.title} style={{ marginBottom: 40, paddingBottom: 40, borderBottom: '1px solid rgba(167,139,250,0.08)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>{section.title}</h2>
            <div style={{ color: '#64748b', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
              {section.content}
            </div>
          </div>
        ))}

        <div style={{ padding: '24px', borderRadius: 12, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', marginTop: 16 }}>
          <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            <strong style={{ color: '#a78bfa' }}>Kontakt na pověřence pro ochranu osobních údajů:</strong><br />
            E-mail: gdpr@aiweb.cz | AIWEB s.r.o., Václavské náměstí 1, 110 00 Praha 1
          </p>
        </div>

        <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid rgba(167,139,250,0.08)', textAlign: 'center' }}>
          <Link href="/aiweb" style={{
            display: 'inline-block', padding: '12px 28px', borderRadius: 10,
            background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
            color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 15,
          }}>
            ← Zpět na hlavní stránku
          </Link>
        </div>
      </div>
    </div>
  );
}
