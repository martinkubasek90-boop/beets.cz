export type ProductCategory =
  | "panely"
  | "stridace"
  | "baterie"
  | "ems"
  | "montazni_systemy"
  | "nabijeci_stanice"
  | "tepelna_cerpadla"
  | "prislusenstvi";

export type InquiryInterest = ProductCategory | "kompletni_sestava";

export type InquiryStatus =
  | "nova"
  | "v_jednani"
  | "nabidka_odeslana"
  | "uzavreno"
  | "zruseno";

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  brand?: string;
  price?: number;
  price_with_vat?: number;
  image_url?: string;
  description?: string;
  specifications?: Record<string, string | number | boolean>;
  art_number?: string;
  in_stock?: boolean;
  is_promo?: boolean;
  promo_label?: string;
  original_price?: number;
};

export type Inquiry = {
  contact_name: string;
  company?: string;
  email: string;
  phone?: string;
  product_interest: InquiryInterest;
  message: string;
  status?: InquiryStatus;
  estimated_quantity?: number;
  product_id?: string;
};

export type Promotion = {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  discount_percent?: number;
  valid_from?: string;
  valid_to?: string;
  is_active?: boolean;
  highlight_color?: string;
  category?: ProductCategory;
};

export const categoryLabels: Record<ProductCategory, string> = {
  panely: "Panely",
  stridace: "Střídače",
  baterie: "Baterie",
  ems: "EMS",
  montazni_systemy: "Montážní systémy",
  nabijeci_stanice: "Nabíjecí stanice",
  tepelna_cerpadla: "Tepelná čerpadla",
  prislusenstvi: "Příslušenství",
};

export const products: Product[] = [
  {
    id: "p1",
    name: "Trina Solar Vertex S+ 450 W",
    category: "panely",
    brand: "Trina Solar",
    price: 1949,
    price_with_vat: 2358,
    art_number: "TSM-450S+",
    in_stock: true,
    is_promo: true,
    promo_label: "TIP",
    original_price: 2199,
    image_url:
      "https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=1200&auto=format&fit=crop",
    description: "Vysoce účinný mono panel pro rezidenční i komerční použití.",
    specifications: {
      Vykon: "450 W",
      Technologie: "N-type TOPCon",
      Zaruka: "25 let",
    },
  },
  {
    id: "p2",
    name: "GoodWe ET Plus+ GW10K-ET",
    category: "stridace",
    brand: "GoodWe",
    price: 37990,
    price_with_vat: 45968,
    art_number: "GW10K-ET",
    in_stock: true,
    is_promo: false,
    image_url:
      "https://images.unsplash.com/photo-1613665813446-82a78c468a1d?q=80&w=1200&auto=format&fit=crop",
    description: "Hybridní třífázový střídač připravený pro baterie.",
    specifications: {
      Vykon: "10 kW",
      Faze: "3",
      Ucinnost: "98.2 %",
    },
  },
  {
    id: "p3",
    name: "BYD Battery-Box Premium HVS 10.2",
    category: "baterie",
    brand: "BYD",
    price: 122900,
    price_with_vat: 148709,
    art_number: "HVS-10.2",
    in_stock: false,
    is_promo: true,
    promo_label: "NOVINKA",
    original_price: 129900,
    image_url:
      "https://images.unsplash.com/photo-1595437193398-f24279553f4f?q=80&w=1200&auto=format&fit=crop",
    description: "Modulární vysokonapěťové úložiště pro domácí i menší komerční systémy.",
    specifications: {
      Kapacita: "10.24 kWh",
      Typ: "LiFePO4",
      Modularita: true,
    },
  },
  {
    id: "p4",
    name: "Huawei SUN2000-15KTL-M5",
    category: "stridace",
    brand: "Huawei",
    price: 42890,
    price_with_vat: 51897,
    art_number: "SUN2000-15KTL-M5",
    in_stock: true,
    is_promo: true,
    promo_label: "TOP",
    original_price: 45990,
    image_url:
      "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?q=80&w=1200&auto=format&fit=crop",
    description: "Třífázový stringový střídač pro rezidenční i menší komerční instalace.",
    specifications: {
      Vykon: "15 kW",
      Faze: "3",
      Ucinnost: "98.4 %",
    },
  },
  {
    id: "p5",
    name: "JA Solar JAM54S31 405 W",
    category: "panely",
    brand: "JA Solar",
    price: 1690,
    price_with_vat: 2045,
    art_number: "JAM54S31-405",
    in_stock: true,
    is_promo: false,
    image_url:
      "https://images.unsplash.com/photo-1466611653911-95081537e5b7?q=80&w=1200&auto=format&fit=crop",
    description: "Spolehlivý panel pro domácí instalace a menší projekty.",
    specifications: {
      Vykon: "405 W",
      Technologie: "Mono PERC",
      Zaruka: "25 let",
    },
  },
  {
    id: "p6",
    name: "Canadian Solar HiKu6 540 W",
    category: "panely",
    brand: "Canadian Solar",
    price: 2350,
    price_with_vat: 2844,
    art_number: "CS6W-540",
    in_stock: true,
    is_promo: true,
    promo_label: "AKCE",
    original_price: 2520,
    image_url:
      "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=1200&auto=format&fit=crop",
    description: "Panel vyšší třídy pro komerční střechy i ground mount systémy.",
    specifications: {
      Vykon: "540 W",
      Technologie: "Mono",
      Zaruka: "25 let",
    },
  },
  {
    id: "p7",
    name: "Fronius Symo GEN24 10.0 Plus",
    category: "stridace",
    brand: "Fronius",
    price: 59990,
    price_with_vat: 72588,
    art_number: "GEN24-10",
    in_stock: true,
    is_promo: false,
    image_url:
      "https://images.unsplash.com/photo-1559302504-64aae6ca6b6d?q=80&w=1200&auto=format&fit=crop",
    description: "Prémiový hybridní střídač s podporou záložního napájení.",
    specifications: {
      Vykon: "10 kW",
      Faze: "3",
      Hybridni: true,
    },
  },
  {
    id: "p8",
    name: "SolaX X3-Hybrid G4 12 kW",
    category: "stridace",
    brand: "SolaX",
    price: 48900,
    price_with_vat: 59169,
    art_number: "X3-HYBRID-12",
    in_stock: true,
    is_promo: false,
    image_url:
      "https://images.unsplash.com/photo-1497440001374-f26997328c1b?q=80&w=1200&auto=format&fit=crop",
    description: "Flexibilní hybridní řešení pro moderní fotovoltaické systémy.",
    specifications: {
      Vykon: "12 kW",
      Faze: "3",
      Ucinnost: "97.8 %",
    },
  },
  {
    id: "p9",
    name: "Pylontech Force H2 10.66 kWh",
    category: "baterie",
    brand: "Pylontech",
    price: 96800,
    price_with_vat: 117128,
    art_number: "FORCE-H2-10.66",
    in_stock: true,
    is_promo: false,
    image_url:
      "https://images.unsplash.com/photo-1593941707882-a56bbc8df5b1?q=80&w=1200&auto=format&fit=crop",
    description: "Vysokonapěťové modulární úložiště s jednoduchým rozšiřováním kapacity.",
    specifications: {
      Kapacita: "10.66 kWh",
      Typ: "LiFePO4",
      Modularita: true,
    },
  },
  {
    id: "p10",
    name: "Dyness Tower T10 10.7 kWh",
    category: "baterie",
    brand: "Dyness",
    price: 88900,
    price_with_vat: 107569,
    art_number: "TOWER-T10",
    in_stock: true,
    is_promo: true,
    promo_label: "TIP",
    original_price: 93900,
    image_url:
      "https://images.unsplash.com/photo-1558449028-b53a39d100fc?q=80&w=1200&auto=format&fit=crop",
    description: "Domácí bateriový systém s vysokou účinností a dlouhou životností.",
    specifications: {
      Kapacita: "10.7 kWh",
      Typ: "LiFePO4",
      Zaruka: "10 let",
    },
  },
  {
    id: "p11",
    name: "K2 SingleRail montážní set",
    category: "montazni_systemy",
    brand: "K2 Systems",
    price: 5590,
    price_with_vat: 6764,
    art_number: "K2-SINGLERAIL-SET",
    in_stock: true,
    is_promo: false,
    image_url:
      "https://images.unsplash.com/photo-1632923057159-38f3e4f5f0d6?q=80&w=1200&auto=format&fit=crop",
    description: "Kompletní montážní sada pro šikmé střechy.",
    specifications: {
      Typ: "Šikmá střecha",
      Material: "Hliník",
      Certifikace: "EN 1090",
    },
  },
  {
    id: "p12",
    name: "Sungrow EV Charger 22 kW",
    category: "nabijeci_stanice",
    brand: "Sungrow",
    price: 14990,
    price_with_vat: 18138,
    art_number: "AC22KW",
    in_stock: true,
    is_promo: false,
    image_url:
      "https://images.unsplash.com/photo-1621066635482-5f0f0337f251?q=80&w=1200&auto=format&fit=crop",
    description: "Wallbox s dynamickým řízením výkonu a RFID.",
    specifications: {
      Vykon: "22 kW",
      Konektor: "Type 2",
      RFID: true,
    },
  },
];

export const promotions: Promotion[] = [
  {
    id: "pr1",
    title: "Jarní promo na panely",
    description: "Sleva na vybrané FV panely při odběru od 30 ks.",
    discount_percent: 12,
    valid_from: "2026-03-01",
    valid_to: "2026-03-31",
    is_active: true,
    highlight_color: "#FFE500",
    category: "panely",
  },
  {
    id: "pr2",
    title: "Baterie s dopravou zdarma",
    description: "Na bateriové systémy BYD doprava zdarma po celé ČR.",
    discount_percent: 8,
    valid_from: "2026-03-05",
    valid_to: "2026-03-25",
    is_active: true,
    highlight_color: "#B8F3FF",
    category: "baterie",
  },
];
