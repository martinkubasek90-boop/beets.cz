import type { Gallery4Item } from "@/components/aiweb/gallery4";

import { EXAMPLES, type ExampleSite } from "./data";

const createPreviewSvg = (example: ExampleSite) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="900" viewBox="0 0 720 900" fill="none">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${example.bg}" />
          <stop offset="100%" stop-color="${example.surface}" />
        </linearGradient>
        <linearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${example.primary}" />
          <stop offset="100%" stop-color="${example.primaryLight}" />
        </linearGradient>
      </defs>
      <rect width="720" height="900" rx="36" fill="url(#bg)" />
      <rect x="44" y="36" width="632" height="44" rx="18" fill="rgba(255,255,255,0.08)" />
      <circle cx="78" cy="58" r="6" fill="${example.primaryLight}" />
      <circle cx="100" cy="58" r="6" fill="${example.primary}" opacity="0.75" />
      <circle cx="122" cy="58" r="6" fill="${example.text}" opacity="0.25" />
      <rect x="44" y="112" width="632" height="308" rx="28" fill="url(#hero)" />
      <rect x="84" y="164" width="182" height="16" rx="8" fill="${example.text}" opacity="0.22" />
      <rect x="84" y="212" width="382" height="24" rx="12" fill="${example.text}" opacity="0.95" />
      <rect x="84" y="250" width="294" height="24" rx="12" fill="${example.text}" opacity="0.95" />
      <rect x="84" y="304" width="252" height="12" rx="6" fill="${example.text}" opacity="0.35" />
      <rect x="84" y="330" width="204" height="12" rx="6" fill="${example.text}" opacity="0.22" />
      <rect x="84" y="366" width="148" height="40" rx="20" fill="${example.bg}" opacity="0.88" />
      <rect x="252" y="366" width="136" height="40" rx="20" fill="${example.text}" opacity="0.14" />
      <rect x="44" y="456" width="302" height="176" rx="24" fill="rgba(255,255,255,0.05)" stroke="${example.border}" />
      <rect x="374" y="456" width="302" height="176" rx="24" fill="rgba(255,255,255,0.05)" stroke="${example.border}" />
      <rect x="44" y="660" width="632" height="188" rx="28" fill="rgba(255,255,255,0.04)" stroke="${example.border}" />
      <rect x="74" y="492" width="108" height="14" rx="7" fill="${example.primary}" />
      <rect x="74" y="528" width="186" height="12" rx="6" fill="${example.text}" opacity="0.22" />
      <rect x="74" y="552" width="152" height="12" rx="6" fill="${example.text}" opacity="0.16" />
      <rect x="404" y="492" width="108" height="14" rx="7" fill="${example.primaryLight}" />
      <rect x="404" y="528" width="186" height="12" rx="6" fill="${example.text}" opacity="0.22" />
      <rect x="404" y="552" width="152" height="12" rx="6" fill="${example.text}" opacity="0.16" />
      <rect x="74" y="708" width="188" height="16" rx="8" fill="${example.text}" opacity="0.85" />
      <rect x="74" y="742" width="248" height="12" rx="6" fill="${example.text}" opacity="0.18" />
      <rect x="74" y="768" width="216" height="12" rx="6" fill="${example.text}" opacity="0.14" />
      <rect x="516" y="702" width="112" height="112" rx="24" fill="url(#hero)" opacity="0.9" />
      <text x="84" y="130" fill="${example.text}" fill-opacity="0.6" font-family="Arial, sans-serif" font-size="18" letter-spacing="4">${example.industry.toUpperCase()}</text>
      <text x="84" y="624" fill="${example.text}" fill-opacity="0.92" font-family="Arial, sans-serif" font-size="32" font-weight="700">${example.name}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const GALLERY_ITEMS: Gallery4Item[] = EXAMPLES.map((example) => ({
  id: example.slug,
  title: example.name,
  description: example.tagline,
  href: `/aiweb/examples/${example.slug}`,
  image: createPreviewSvg(example),
}));
