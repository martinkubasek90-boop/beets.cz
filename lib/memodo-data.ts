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
      "https://images.unsplash.com/photo-1592833159155-c62df1b65634?q=80&w=1200&auto=format&fit=crop",
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
      "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?q=80&w=1200&auto=format&fit=crop",
    description: "Modulární vysokonapěťové úložiště pro domácí i menší komerční systémy.",
    specifications: {
      Kapacita: "10.24 kWh",
      Typ: "LiFePO4",
      Modularita: true,
    },
  },
  {
    id: "p4",
    name: "Sungrow EV Charger 22 kW",
    category: "nabijeci_stanice",
    brand: "Sungrow",
    price: 14990,
    price_with_vat: 18138,
    art_number: "AC22KW",
    in_stock: true,
    is_promo: false,
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

