export interface ExampleSite {
  slug: string;
  industry: string;
  name: string;
  tagline: string;
  description: string;
  // Colors
  bg: string;
  surface: string;
  primary: string;
  primaryLight: string;
  text: string;
  textMuted: string;
  border: string;
  // Hero
  heroLabel: string;
  heroH1: string[];      // lines
  heroSub: string;
  heroCta: string;
  heroCtaSecondary: string;
  // Sections
  sections: Section[];
  // Footer
  footerTagline: string;
  footerLinks: string[];
}

export interface Section {
  type: 'features' | 'about' | 'gallery' | 'pricing' | 'team' | 'menu' | 'cta';
  label?: string;
  title: string;
  sub?: string;
  items?: { icon: string; title: string; desc: string }[];
  text?: string;
  ctaText?: string;
}

export const EXAMPLES: ExampleSite[] = [
  {
    slug: 'restaurace',
    industry: 'Restaurace',
    name: 'Restaurace',
    tagline: 'Template pro moderní podnik s rezervacemi a menu',
    description: 'Ukázka výrazného gastrowebu pro restauraci nebo podnik, který chce spojit atmosféru, menu a rezervace do jednoho zážitku.',
    bg: '#0d0800', surface: '#1a1000', primary: '#e85d04', primaryLight: '#fb923c',
    text: '#fef3c7', textMuted: '#92400e', border: 'rgba(232,93,4,0.2)',
    heroLabel: 'Template pro gastro provoz',
    heroH1: ['Web pro', 'restauraci, který', 'prodává atmosféru'],
    heroSub: 'Template ukazuje, jak může restaurace prezentovat menu, rezervace, lokální suroviny i celkový zážitek z návštěvy.',
    heroCta: 'Rezervovat stůl',
    heroCtaSecondary: 'Prohlédnout menu',
    sections: [
      { type: 'features', label: 'Proč k nám', title: 'Chuť, na kterou se nezapomíná', sub: 'Každý pokrm je příběh.', items: [
        { icon: '🌿', title: 'Lokální suroviny', desc: 'Sekce pro zdůraznění kvality surovin, původu a poctivého přístupu kuchyně.' },
        { icon: '👨‍🍳', title: 'Silný koncept podniku', desc: 'Prostor pro příběh šéfkuchaře, filozofii menu nebo odlišení od konkurence.' },
        { icon: '🍷', title: 'Přehled menu a nápojů', desc: 'Jasně strukturovaná nabídka jídel, degustačních večerů nebo vinného lístku.' },
        { icon: '🎉', title: 'Rezervace a akce', desc: 'Možnost propagovat soukromé akce, oslavy, firemní večery i rychlé rezervace.' },
      ]},
      { type: 'cta', title: 'Rezervujte si stůl ještě dnes', sub: 'Kapacita je omezená. Rezervace online nebo na telefonu.', ctaText: 'Rezervovat online' },
    ],
    footerTagline: 'Template pro restauraci · Rezervace · Menu · Kontakt',
    footerLinks: ['Menu', 'Rezervace', 'Akce', 'Kontakt'],
  },
  {
    slug: 'fitness',
    industry: 'Fitness studio',
    name: 'Fitness',
    tagline: 'Template pro studio, gym nebo trenérský brand',
    description: 'Ukázka energického fitness webu pro studio nebo trenérský koncept, který potřebuje prodávat členství, lekce a výsledky.',
    bg: '#080808', surface: '#111111', primary: '#ef4444', primaryLight: '#f87171',
    text: '#ffffff', textMuted: '#6b7280', border: 'rgba(239,68,68,0.2)',
    heroLabel: 'Template pro sport a výkon',
    heroH1: ['Trénink, který', 'má energii', 'i jasnou nabídku'],
    heroSub: 'Template ukazuje, jak může fitness projekt prodávat členství, lekce, osobní tréninky i vlastní aplikaci nebo rezervační systém.',
    heroCta: 'Zkusit zdarma 14 dní',
    heroCtaSecondary: 'Prohlédnout lekce',
    sections: [
      { type: 'features', label: 'Co nabízíme', title: 'Vše, co potřebuješ', items: [
        { icon: '🏋️', title: 'Vybavení a zóny', desc: 'Sekce pro cardio, silovou část, funkční trénink nebo specializované studio.' },
        { icon: '🧑‍🏫', title: 'Trenéři a vedení', desc: 'Představení trenérů, jejich specializací a hlavních benefitů pro klienty.' },
        { icon: '🥗', title: 'Doplňkové služby', desc: 'Možnost ukázat výživové poradenství, diagnostiku nebo individuální plán.' },
        { icon: '📱', title: 'Rezervace a členství', desc: 'Jasný onboarding pro vstup zdarma, rezervaci lekce nebo nákup členství.' },
      ]},
      { type: 'pricing', label: 'Ceník', title: 'Jednoduchá cena. Žádné překvapení.', items: [
        { icon: '⚡', title: 'Základní', desc: '590 Kč / měsíc · Neomezený přístup do fitness' },
        { icon: '🔥', title: 'Pro', desc: '990 Kč / měsíc · Fitness + skupinové lekce' },
        { icon: '👑', title: 'Elite', desc: '1 690 Kč / měsíc · Vše včetně osobního trenéra' },
      ]},
    ],
    footerTagline: 'Template pro fitness studio · Lekce · Členství · Kontakt',
    footerLinks: ['Lekce', 'Trenéři', 'Ceník', 'Kontakt'],
  },
  {
    slug: 'reality',
    industry: 'Realitní kancelář',
    name: 'Reality',
    tagline: 'Template pro makléře a realitní kancelář',
    description: 'Ukázka prémiového realitního webu pro makléře nebo kancelář, která chce spojit důvěru, nabídku i lead generation.',
    bg: '#030d0a', surface: '#061410', primary: '#10b981', primaryLight: '#34d399',
    text: '#f0fdf4', textMuted: '#065f46', border: 'rgba(16,185,129,0.2)',
    heroLabel: 'Template pro prodej a pronájem',
    heroH1: ['Reality web,', 'který budí', 'důvěru'],
    heroSub: 'Template ukazuje, jak může realitní web prezentovat nabídku, služby makléře, reference i rychlý sběr leadů.',
    heroCta: 'Bezplatná konzultace',
    heroCtaSecondary: 'Aktuální nabídka',
    sections: [
      { type: 'features', label: 'Proč realitní template', title: 'Nemovitosti bez starostí', items: [
        { icon: '🏠', title: 'Rezidenční nabídka', desc: 'Prostor pro byty, domy, vily i developerské projekty v přehledném rozložení.' },
        { icon: '🏢', title: 'Komerční nemovitosti', desc: 'Možnost odlišit kanceláře, sklady, retail nebo investiční příležitosti.' },
        { icon: '📋', title: 'Služby makléře', desc: 'Jasné vysvětlení procesu prodeje, právního servisu a práce s klientem.' },
        { icon: '💰', title: 'Lead generation', desc: 'Výzvy k akci pro zájemce o prodej, pronájem i bezplatnou konzultaci.' },
      ]},
      { type: 'cta', title: 'Prodáváte nebo kupujete?', sub: 'Zavolejte nám nebo napište. Poradíme zdarma a nezávazně.', ctaText: 'Kontaktovat makléře' },
    ],
    footerTagline: 'Template pro reality · Nabídka · Makléři · Kontakt',
    footerLinks: ['Nabídka', 'Makléři', 'Prodej nemovitosti', 'Kontakt'],
  },
  {
    slug: 'kavarna',
    industry: 'Cafe',
    name: 'Cafe',
    tagline: 'Template pro kavárnu, brunch spot nebo coffee brand',
    description: 'Ukázka stylového kavárenského webu pro podnik, který chce prodávat vibe, menu, lokaci i vlastní charakter místa.',
    bg: '#0d0a06', surface: '#1a1408', primary: '#a16207', primaryLight: '#d97706',
    text: '#fef9ee', textMuted: '#78350f', border: 'rgba(161,98,7,0.25)',
    heroLabel: 'Template pro cafe a brunch',
    heroH1: ['Atmosféra,', 'kterou host', 'cítí hned'],
    heroSub: 'Template je navržený pro podniky, které chtějí prodávat nejen kávu, ale i celkový vibe, interiér a zážitek z návštěvy.',
    heroCta: 'Naše menu',
    heroCtaSecondary: 'Jak nás najít',
    sections: [
      { type: 'features', label: 'Co u nás najdeš', title: 'Víc než jen káva', items: [
        { icon: '☕', title: 'Káva a signature nabídka', desc: 'Prostor pro espresso menu, filtr, seasonal drinks nebo vlastní směs.' },
        { icon: '🥐', title: 'Jídlo a pečivo', desc: 'Sekce pro brunch, dezerty, snídaně i denní nabídku ve vizuálně čistém layoutu.' },
        { icon: '🌿', title: 'Atmosféra podniku', desc: 'Možnost zdůraznit interiér, terasu, design i komunitní vibe místa.' },
        { icon: '💻', title: 'Lokace a praktičnost', desc: 'Rychlé napojení na mapu, otevírací dobu a základní kontaktní informace.' },
      ]},
      { type: 'cta', title: 'Přijď si na kávu', sub: 'Máme 40 míst k sezení, venkovní terasu a soukromý salon na akce.', ctaText: 'Zobrazit mapu' },
    ],
    footerTagline: 'Template pro cafe · Menu · O nás · Kontakt',
    footerLinks: ['Menu', 'O nás', 'Akce', 'Kontakt'],
  },
  {
    slug: 'architekt',
    industry: 'Architektonické studio',
    name: 'Architektonické studio',
    tagline: 'Template pro studio, interiéry a realizace',
    description: 'Ukázka minimalistického studiového webu pro architekta nebo designové studio, které staví na silném vizuálu a referencích.',
    bg: '#080808', surface: '#0f0f0f', primary: '#f8fafc', primaryLight: '#ffffff',
    text: '#f8fafc', textMuted: '#475569', border: 'rgba(248,250,252,0.1)',
    heroLabel: 'Template pro architekturu a design',
    heroH1: ['Prostor,', 'který má', 'jasný výraz'],
    heroSub: 'Template ukazuje, jak může studio prezentovat služby, portfolio, proces i vlastní designový rukopis.',
    heroCta: 'Zahájit projekt',
    heroCtaSecondary: 'Portfolio',
    sections: [
      { type: 'features', label: 'Služby', title: 'Co navrhujeme', items: [
        { icon: '🏗️', title: 'Novostavby a návrhy', desc: 'Sekce pro prezentaci studií, novostaveb a koncepčních projektů.' },
        { icon: '🔨', title: 'Rekonstrukce', desc: 'Ukázka realizací, proměn prostoru a práce s existující dispozicí.' },
        { icon: '🛋️', title: 'Interiéry', desc: 'Prostor pro interiérový design, materiály a autorský přístup studia.' },
        { icon: '📐', title: 'Proces spolupráce', desc: 'Jasné vysvětlení průběhu od první konzultace po realizaci.' },
      ]},
      { type: 'cta', title: 'Začněme spolu', sub: 'Úvodní konzultace zdarma. Přivezeme skici a inspiraci přímo k vám.', ctaText: 'Kontaktovat studio' },
    ],
    footerTagline: 'Template pro architektonické studio · Portfolio · Proces · Kontakt',
    footerLinks: ['Portfolio', 'Proces', 'Tým', 'Kontakt'],
  },
  {
    slug: 'zubar',
    industry: 'Zubní klinika',
    name: 'Zubař',
    tagline: 'Template pro ordinaci nebo moderní kliniku',
    description: 'Ukázka důvěryhodného webu pro zubní ordinaci nebo kliniku, která chce působit čistě, klidně a profesionálně.',
    bg: '#f8fafc', surface: '#ffffff', primary: '#2563eb', primaryLight: '#3b82f6',
    text: '#0f172a', textMuted: '#64748b', border: 'rgba(37,99,235,0.15)',
    heroLabel: 'Template pro zdravotní služby',
    heroH1: ['Důvěra, klid', 'a jasná péče', 'na jednom webu'],
    heroSub: 'Template ukazuje, jak může ordinace přehledně představit služby, tým, objednání i výhody pro nové pacienty.',
    heroCta: 'Objednat se',
    heroCtaSecondary: 'Naše služby',
    sections: [
      { type: 'features', label: 'Ošetření', title: 'Komplexní péče o váš chrup', items: [
        { icon: '🦷', title: 'Preventivní péče', desc: 'Přehledná prezentace vstupních prohlídek, hygieny a pravidelné péče.' },
        { icon: '🔬', title: 'Specializované zákroky', desc: 'Sekce pro implantáty, estetickou stomatologii nebo chirurgické služby.' },
        { icon: '✨', title: 'Estetika a komfort', desc: 'Možnost komunikovat bezbolestný přístup, moderní vybavení a kvalitu péče.' },
        { icon: '😁', title: 'Objednání nových pacientů', desc: 'Silná CTA pro registraci, rezervaci termínu i rychlý kontakt.' },
      ]},
      { type: 'cta', title: 'Objednejte se online', sub: 'Volné termíny do 48 hodin. Přijímáme všechny pojišťovny.', ctaText: 'Vybrat termín' },
    ],
    footerTagline: 'Template pro zubní kliniku · Služby · Tým · Kontakt',
    footerLinks: ['Ošetření', 'Tým', 'Ceník', 'Kontakt'],
  },
  {
    slug: 'startup',
    industry: 'Startup',
    name: 'Startup',
    tagline: 'Template pro SaaS, appku nebo tech produkt',
    description: 'Ukázka produktového webu pro startup nebo SaaS, který musí rychle vysvětlit hodnotu a převést návštěvníka na demo.',
    bg: '#04050f', surface: '#080b1a', primary: '#8b5cf6', primaryLight: '#a78bfa',
    text: '#f1f5f9', textMuted: '#64748b', border: 'rgba(139,92,246,0.2)',
    heroLabel: 'Template pro digitální produkt',
    heroH1: ['Produktový web,', 'který vysvětlí', 'hodnotu rychle'],
    heroSub: 'Template ukazuje, jak postavit landing pro SaaS nebo startup tak, aby spojil silné sdělení, funkce, pricing i conversion flow.',
    heroCta: 'Zkusit 14 dní zdarma',
    heroCtaSecondary: 'Jak to funguje',
    sections: [
      { type: 'features', label: 'Funkce', title: 'Platforma, která pracuje za vás', items: [
        { icon: '🤖', title: 'Hlavní produktová výhoda', desc: 'Sekce pro automatizaci, AI, workflow nebo jiný hlavní benefit produktu.' },
        { icon: '🔗', title: 'Integrace a ekosystém', desc: 'Vysvětlení napojení na další nástroje a celkového zapojení do workflow klienta.' },
        { icon: '📊', title: 'Měřitelné výsledky', desc: 'Prostor pro dashboardy, úsporu času, reporting nebo business impact.' },
        { icon: '🔐', title: 'Bezpečnost a důvěra', desc: 'Jasná komunikace security, compliance a enterprise readiness.' },
      ]},
      { type: 'pricing', label: 'Ceník', title: 'Roste s vámi', items: [
        { icon: '🚀', title: 'Starter', desc: '$49/měs · 5 uživatelů, 10 automatizací' },
        { icon: '⚡', title: 'Business', desc: '$199/měs · 25 uživatelů, neomezené automatizace' },
        { icon: '🏢', title: 'Enterprise', desc: 'Na míru · SLA, dedikovaný support, on-premise' },
      ]},
    ],
    footerTagline: 'Template pro startup · Produkt · Ceník · Kontakt',
    footerLinks: ['Produkt', 'Ceník', 'Dokumentace', 'Kontakt'],
  },
  {
    slug: 'penzion',
    industry: 'Penzion',
    name: 'Penzion',
    tagline: 'Template pro ubytování, pobyty a přímé rezervace',
    description: 'Ukázka webu pro penzion, horskou chatu nebo boutique ubytování, které chce prodávat pobyty přímo bez prostředníků.',
    bg: '#07111a', surface: '#0d1824', primary: '#38bdf8', primaryLight: '#7dd3fc',
    text: '#e0f2fe', textMuted: '#7dd3fc', border: 'rgba(56,189,248,0.2)',
    heroLabel: 'Template pro ubytování a hospitality',
    heroH1: ['Klidné místo,', 'které host', 'chce rezervovat hned'],
    heroSub: 'Template ukazuje, jak může penzion prezentovat pokoje, lokalitu, služby i přímou rezervaci bez závislosti na externích portálech.',
    heroCta: 'Rezervovat pobyt',
    heroCtaSecondary: 'Prohlédnout pokoje',
    sections: [
      { type: 'features', label: 'Co web ukáže', title: 'Ubytování, které má atmosféru i výkon', items: [
        { icon: '🛏️', title: 'Pokoje a apartmány', desc: 'Přehledná prezentace kapacit, fotek, vybavení i sezónních balíčků.' },
        { icon: '🌲', title: 'Lokalita a zážitky', desc: 'Sekce pro výlety, wellness, okolní přírodu, cyklostezky nebo zimní sezónu.' },
        { icon: '🍳', title: 'Služby a komfort', desc: 'Možnost ukázat snídaně, parkování, wellness, dětské zázemí nebo domácí atmosféru.' },
        { icon: '📅', title: 'Přímá rezervace', desc: 'Silné CTA pro poptávku pobytu, dostupnost termínu a kontakt bez prostředníků.' },
      ]},
      { type: 'cta', title: 'Naplánujte si pobyt', sub: 'Web může vést návštěvníka od prvního dojmu až k přímé rezervaci během pár kliknutí.', ctaText: 'Odeslat poptávku' },
    ],
    footerTagline: 'Template pro penzion · Pokoje · Pobytové balíčky · Kontakt',
    footerLinks: ['Pokoje', 'Ceník', 'Galerie', 'Kontakt'],
  },
  {
    slug: 'hotel',
    industry: 'Hotel',
    name: 'Hotel',
    tagline: 'Template pro hotel, resort nebo boutique retreat',
    description: 'Ukázka vícestránkového hotelového webu s hlavní stránkou, pokoji, zážitky a kontaktem propojeným přes CTA.',
    bg: '#fcf9f4',
    surface: '#f0ede8',
    primary: '#173124',
    primaryLight: '#496455',
    text: '#1c1c19',
    textMuted: '#727973',
    border: 'rgba(114,121,115,0.25)',
    heroLabel: 'Template pro hospitality',
    heroH1: ['Hotelový web,', 'který prodává', 'pobyt i atmosféru'],
    heroSub: 'Vícestránková ukázka pro hotel nebo resort. Obsahuje hlavní landing page, podstránku pokojů, zážitků a kontaktu s napojenými CTA.',
    heroCta: 'Rezervovat pobyt',
    heroCtaSecondary: 'Prohlédnout pokoje',
    sections: [
      { type: 'features', label: 'Co web obsahuje', title: 'Vícestránkový hotelový template', sub: 'Každá část webu má vlastní účel i vlastní konverzní cestu.', items: [
        { icon: '🏔️', title: 'Atmosférická homepage', desc: 'Silný první dojem s důrazem na lokaci, emoci a značku hotelu.' },
        { icon: '🛏️', title: 'Podstránka pokojů', desc: 'Přehled pokojů, filtr dostupnosti, ceny a CTA na rezervaci.' },
        { icon: '✨', title: 'Podstránka zážitků', desc: 'Wellness, gastronomie, výlety a pobytové balíčky v samostatném layoutu.' },
        { icon: '📩', title: 'Kontaktní stránka', desc: 'Mapa, cesta autem i vlakem, formulář a jasné rezervační kontakty.' },
      ]},
      { type: 'cta', title: 'Prohlédněte si kompletní hotelový web', sub: 'Template je rozdělený do více stránek stejně jako reálný hotelový web pro hosty.', ctaText: 'Otevřít ukázku hotelu' },
    ],
    footerTagline: 'Template pro hotel · Homepage · Pokoje · Zážitky · Kontakt',
    footerLinks: ['Home', 'Rooms', 'Experience', 'Contact'],
  },
];
