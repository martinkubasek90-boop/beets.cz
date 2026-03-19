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
    name: 'U Krále',
    tagline: 'Tradiční česká kuchyně v moderním hávu',
    description: 'Rodinná restaurace s 20 lety tradice. Čerstvé suroviny, domácí recepty.',
    bg: '#0d0800', surface: '#1a1000', primary: '#e85d04', primaryLight: '#fb923c',
    text: '#fef3c7', textMuted: '#92400e', border: 'rgba(232,93,4,0.2)',
    heroLabel: 'Praha 2 · Otevřeno každý den',
    heroH1: ['Jídlo, které', 'chutná jako', 'od maminky'],
    heroSub: 'Vítejte v restauraci U Krále, kde každý pokrm připravujeme s láskou ze surovin od lokálních farmářů.',
    heroCta: 'Rezervovat stůl',
    heroCtaSecondary: 'Prohlédnout menu',
    sections: [
      { type: 'features', label: 'Proč k nám', title: 'Chuť, na kterou se nezapomíná', sub: 'Každý pokrm je příběh.', items: [
        { icon: '🌿', title: 'Lokální suroviny', desc: 'Zelenina a maso od prověřených farmářů z okolí Prahy.' },
        { icon: '👨‍🍳', title: 'Šéfkuchař s vášní', desc: 'Martin Král vaří českou kuchyni 20 let. Každý recept je originál.' },
        { icon: '🍷', title: 'Moravská vína', desc: 'Výběr více než 40 moravských vín párovaných k pokrmům.' },
        { icon: '🎉', title: 'Soukromé akce', desc: 'Narozeniny, firemní večeře, svatby. Postaráme se o vše.' },
      ]},
      { type: 'cta', title: 'Rezervujte si stůl ještě dnes', sub: 'Kapacita je omezená. Rezervace online nebo na telefonu.', ctaText: 'Rezervovat online' },
    ],
    footerTagline: 'Restaurace U Krále · Praha 2 · Po–Ne 11:00–23:00',
    footerLinks: ['Menu', 'Rezervace', 'Akce', 'Kontakt'],
  },
  {
    slug: 'fitness',
    industry: 'Fitness studio',
    name: 'FitZone',
    tagline: 'Překonej své limity. Každý den.',
    description: 'Moderní fitness studio s osobními trenéry, skupinovými lekcemi a výživovým poradenstvím.',
    bg: '#080808', surface: '#111111', primary: '#ef4444', primaryLight: '#f87171',
    text: '#ffffff', textMuted: '#6b7280', border: 'rgba(239,68,68,0.2)',
    heroLabel: 'Praha Žižkov · Otevřeno 5:00–23:00',
    heroH1: ['Tvoje tělo.', 'Tvoje pravidla.'],
    heroSub: 'FitZone není jen posilovna. Je to komunita lidí, kteří se rozhodli žít naplno. Přidej se k nám.',
    heroCta: 'Zkusit zdarma 14 dní',
    heroCtaSecondary: 'Prohlédnout lekce',
    sections: [
      { type: 'features', label: 'Co nabízíme', title: 'Vše, co potřebuješ', items: [
        { icon: '🏋️', title: '400m² vybavení', desc: 'Nejmodernější stroje, volné váhy, funkční zóna. Nikdy nečekáš.' },
        { icon: '🧑‍🏫', title: 'Osobní trenéři', desc: '8 certifikovaných trenérů. Plán přesně na tvůj cíl a možnosti.' },
        { icon: '🥗', title: 'Výživové poradenství', desc: 'Jídelníček na míru. Protože cvičení je jen polovina úspěchu.' },
        { icon: '📱', title: 'FitZone App', desc: 'Sleduj progress, rezervuj lekce a komunikuj s trenérem odkudkoliv.' },
      ]},
      { type: 'pricing', label: 'Ceník', title: 'Jednoduchá cena. Žádné překvapení.', items: [
        { icon: '⚡', title: 'Základní', desc: '590 Kč / měsíc · Neomezený přístup do fitness' },
        { icon: '🔥', title: 'Pro', desc: '990 Kč / měsíc · Fitness + skupinové lekce' },
        { icon: '👑', title: 'Elite', desc: '1 690 Kč / měsíc · Vše včetně osobního trenéra' },
      ]},
    ],
    footerTagline: 'FitZone Studio · Seifertova 51, Praha 3 · info@fitzone.cz',
    footerLinks: ['Lekce', 'Trenéři', 'Ceník', 'Kontakt'],
  },
  {
    slug: 'reality',
    industry: 'Realitní kancelář',
    name: 'PRAGA Reality',
    tagline: 'Nemovitosti s přidanou hodnotou',
    description: 'Prémiová realitní kancelář specializující se na rezidenční a komerční nemovitosti v Praze.',
    bg: '#030d0a', surface: '#061410', primary: '#10b981', primaryLight: '#34d399',
    text: '#f0fdf4', textMuted: '#065f46', border: 'rgba(16,185,129,0.2)',
    heroLabel: 'Praha · 500+ prodaných nemovitostí',
    heroH1: ['Najdeme vám', 'domov, který', 'hledáte.'],
    heroSub: 'Prodej, koupě nebo pronájem — naši makléři vás provedou každým krokem bez zbytečného stresu.',
    heroCta: 'Bezplatná konzultace',
    heroCtaSecondary: 'Aktuální nabídka',
    sections: [
      { type: 'features', label: 'Proč PRAGA Reality', title: 'Nemovitosti bez starostí', items: [
        { icon: '🏠', title: 'Rezidenční nemovitosti', desc: 'Byty, domy, vily. Celá Praha i Středočeský kraj.' },
        { icon: '🏢', title: 'Komerční prostory', desc: 'Kanceláře, obchodní prostory, sklady. Najdeme i specifické požadavky.' },
        { icon: '📋', title: 'Právní servis v ceně', desc: 'Každá transakce zahrnuje kontrolu dokumentů a asistenci u podpisu.' },
        { icon: '💰', title: 'Férová provize', desc: '2% z prodejní ceny. Žádné skryté poplatky, žádná překvapení.' },
      ]},
      { type: 'cta', title: 'Prodáváte nebo kupujete?', sub: 'Zavolejte nám nebo napište. Poradíme zdarma a nezávazně.', ctaText: 'Kontaktovat makléře' },
    ],
    footerTagline: 'PRAGA Reality s.r.o. · Wenceslas Square 38, Praha 1',
    footerLinks: ['Nabídka', 'Makléři', 'Prodej nemovitosti', 'Kontakt'],
  },
  {
    slug: 'kavarna',
    industry: 'Kavárna',
    name: 'Botanika Café',
    tagline: 'Specialitní káva uprostřed zeleně',
    description: 'Útulná kavárna se specialitní kávou, domácím pečivem a tropickými rostlinami.',
    bg: '#0d0a06', surface: '#1a1408', primary: '#a16207', primaryLight: '#d97706',
    text: '#fef9ee', textMuted: '#78350f', border: 'rgba(161,98,7,0.25)',
    heroLabel: 'Vinohrady · Po–Ne 8:00–20:00',
    heroH1: ['Zpomal.', 'Dej si kávu.'],
    heroSub: 'V Botanice věříme, že dobrá káva potřebuje čas. Specialitní zrna z celého světa, připravená s péčí.',
    heroCta: 'Naše menu',
    heroCtaSecondary: 'Jak nás najít',
    sections: [
      { type: 'features', label: 'Co u nás najdeš', title: 'Víc než jen káva', items: [
        { icon: '☕', title: 'Specialitní káva', desc: 'Single origin zrna z Etiopie, Kolumbie a Guatemaly. Filtr i espresso.' },
        { icon: '🥐', title: 'Domácí pečivo', desc: 'Croissanty, scones a koláče pečené každé ráno čerstvě.' },
        { icon: '🌿', title: 'Rostlinné menu', desc: 'Rostlinné alternativy mléka, vegan sladkosti. Pro každého.' },
        { icon: '💻', title: 'Work-friendly', desc: 'Rychlé WiFi, dostatek zásuvek. Ideální místo pro práci z kavárny.' },
      ]},
      { type: 'cta', title: 'Přijď si na kávu', sub: 'Máme 40 míst k sezení, venkovní terasu a soukromý salon na akce.', ctaText: 'Zobrazit mapu' },
    ],
    footerTagline: 'Botanika Café · Mánesova 12, Praha 2 · @botanikacafe',
    footerLinks: ['Menu', 'O nás', 'Akce', 'Kontakt'],
  },
  {
    slug: 'architekt',
    industry: 'Architektonické studio',
    name: 'Studio Form',
    tagline: 'Architektura, která dýchá',
    description: 'Architektonické studio specializující se na rezidenční interiéry a rekonstrukce.',
    bg: '#080808', surface: '#0f0f0f', primary: '#f8fafc', primaryLight: '#ffffff',
    text: '#f8fafc', textMuted: '#475569', border: 'rgba(248,250,252,0.1)',
    heroLabel: 'Praha · Studio od 2015',
    heroH1: ['Prostor', 'je médium.'],
    heroSub: 'Navrhujeme domy, byty a interiéry, které reflektují jejich obyvatele. Každý projekt je jedinečný dialog mezi architektem a klientem.',
    heroCta: 'Zahájit projekt',
    heroCtaSecondary: 'Portfolio',
    sections: [
      { type: 'features', label: 'Služby', title: 'Co navrhujeme', items: [
        { icon: '🏗️', title: 'Novostavby', desc: 'Rodinné domy na klíč. Od studie po stavební povolení.' },
        { icon: '🔨', title: 'Rekonstrukce', desc: 'Byty, vily, historické objekty. Respektujeme genius loci.' },
        { icon: '🛋️', title: 'Interiérový design', desc: 'Kompletní návrh interiéru včetně výběru materiálů a nábytku.' },
        { icon: '📐', title: 'Stavební dozor', desc: 'Dohlížíme na realizaci. Výsledek musí odpovídat projektu.' },
      ]},
      { type: 'cta', title: 'Začněme spolu', sub: 'Úvodní konzultace zdarma. Přivezeme skici a inspiraci přímo k vám.', ctaText: 'Kontaktovat studio' },
    ],
    footerTagline: 'Studio Form s.r.o. · Letná, Praha 7 · form@studioform.cz',
    footerLinks: ['Portfolio', 'Proces', 'Tým', 'Kontakt'],
  },
  {
    slug: 'zubar',
    industry: 'Zubní klinika',
    name: 'DentCare',
    tagline: 'Váš úsměv v dobrých rukou',
    description: 'Moderní zubní klinika v Praze. Implantáty, bělení, ortodoncie a preventivní péče.',
    bg: '#f8fafc', surface: '#ffffff', primary: '#2563eb', primaryLight: '#3b82f6',
    text: '#0f172a', textMuted: '#64748b', border: 'rgba(37,99,235,0.15)',
    heroLabel: 'Praha Dejvice · Přijímáme nové pacienty',
    heroH1: ['Krásný úsměv', 'začíná zde.'],
    heroSub: 'Moderní zubní péče bez bolesti a stresu. Zkušený tým, špičkové vybavení, individuální přístup ke každému pacientovi.',
    heroCta: 'Objednat se',
    heroCtaSecondary: 'Naše služby',
    sections: [
      { type: 'features', label: 'Ošetření', title: 'Komplexní péče o váš chrup', items: [
        { icon: '🦷', title: 'Preventivní péče', desc: 'Pravidelné prohlídky a čištění. Prevence je základ zdravého úsměvu.' },
        { icon: '🔬', title: 'Implantáty', desc: 'Titanové implantáty se zárukou. Náhrada za přirozený zub.' },
        { icon: '✨', title: 'Bělení zubů', desc: 'Profesionální bělení v ordinaci nebo domácí systém. Až o 10 odstínů.' },
        { icon: '😁', title: 'Ortodoncie', desc: 'Fixní a snímatelné rovnátka. Včetně neviditelných dlah Invisalign.' },
      ]},
      { type: 'cta', title: 'Objednejte se online', sub: 'Volné termíny do 48 hodin. Přijímáme všechny pojišťovny.', ctaText: 'Vybrat termín' },
    ],
    footerTagline: 'DentCare s.r.o. · Jugoslávských partyzánů 10, Praha 6 · +420 222 333 444',
    footerLinks: ['Ošetření', 'Tým', 'Ceník', 'Kontakt'],
  },
  {
    slug: 'startup',
    industry: 'SaaS Startup',
    name: 'NovaTech',
    tagline: 'Automatizuj. Optimalizuj. Dominuj.',
    description: 'SaaS platforma pro automatizaci interních procesů středních a velkých firem.',
    bg: '#04050f', surface: '#080b1a', primary: '#8b5cf6', primaryLight: '#a78bfa',
    text: '#f1f5f9', textMuted: '#64748b', border: 'rgba(139,92,246,0.2)',
    heroLabel: '500+ firem · SOC2 certified',
    heroH1: ['Váš tým dělá', 'méně rutiny.', 'Víc výsledků.'],
    heroSub: 'NovaTech automatizuje opakující se procesy ve vaší firmě. Ušetřete 15+ hodin týdně na každého zaměstnance.',
    heroCta: 'Zkusit 14 dní zdarma',
    heroCtaSecondary: 'Jak to funguje',
    sections: [
      { type: 'features', label: 'Funkce', title: 'Platforma, která pracuje za vás', items: [
        { icon: '🤖', title: 'AI automatizace', desc: 'Naučte systém vaše procesy. Zbytek nechte na AI.' },
        { icon: '🔗', title: '200+ integrací', desc: 'Slack, Notion, Salesforce, SAP a stovky dalších nástrojů.' },
        { icon: '📊', title: 'Real-time reporty', desc: 'Dashboardy na míru. Vždy víte, co se ve firmě děje.' },
        { icon: '🔐', title: 'Enterprise security', desc: 'SOC2 Type II, GDPR, SSO. Bezpečnost bez kompromisů.' },
      ]},
      { type: 'pricing', label: 'Ceník', title: 'Roste s vámi', items: [
        { icon: '🚀', title: 'Starter', desc: '$49/měs · 5 uživatelů, 10 automatizací' },
        { icon: '⚡', title: 'Business', desc: '$199/měs · 25 uživatelů, neomezené automatizace' },
        { icon: '🏢', title: 'Enterprise', desc: 'Na míru · SLA, dedikovaný support, on-premise' },
      ]},
    ],
    footerTagline: 'NovaTech Inc. · Praha & San Francisco · hello@novatech.io',
    footerLinks: ['Produkt', 'Ceník', 'Dokumentace', 'Kontakt'],
  },
];
