type KalkulackaPdfPayload = {
  name?: string;
  email?: string;
  company?: string;
  phone?: string;
  calculatorType?: 'bess' | 'fve';
  calculations?: Record<string, number | undefined>;
  inputs?: Record<string, number | string | boolean | undefined>;
};

const pageWidth = 595;
const pageHeight = 842;
const marginX = 50;
const topY = 790;
const lineHeight = 16;

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E]/g, '');
}

function escapePdfText(value: string) {
  return normalizeText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function formatCurrency(value?: number) {
  if (!Number.isFinite(value)) return undefined;
  return `${Math.round(value!).toLocaleString('cs-CZ')} Kc`;
}

function formatNumber(value?: number, digits = 0) {
  if (!Number.isFinite(value)) return undefined;
  return value!.toLocaleString('cs-CZ', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function valueLine(label: string, value?: string | number | boolean, unit = '') {
  if (value === undefined || value === null || value === '') return undefined;
  const shown = typeof value === 'boolean' ? (value ? 'Ano' : 'Ne') : String(value);
  return `${label}: ${shown}${unit ? ` ${unit}` : ''}`;
}

function wrapLine(text: string, maxChars = 92) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines;
}

function pushTextLine(commands: string[], text: string, fontSize: number, y: number) {
  commands.push(`BT /F1 ${fontSize} Tf ${marginX} ${y} Td (${escapePdfText(text)}) Tj ET`);
}

function renderPage(lines: Array<{ text: string; size: number }>) {
  const commands = ['0.12 0.16 0.22 rg', `0 0 ${pageWidth} ${pageHeight} re f`];
  let y = topY;

  lines.forEach((line) => {
    if (!line.text) {
      y -= lineHeight;
      return;
    }

    if (line.size >= 18) commands.push('0.98 1 1 rg');
    else if (line.size >= 13) commands.push('0.45 0.91 0.76 rg');
    else commands.push('0.86 0.9 0.95 rg');

    wrapLine(line.text, line.size >= 18 ? 48 : 86).forEach((wrapped) => {
      pushTextLine(commands, wrapped, line.size, y);
      y -= line.size >= 18 ? 22 : lineHeight;
    });
  });

  return commands.join('\n');
}

function paginate(lines: Array<{ text: string; size: number }>) {
  const pages: Array<Array<{ text: string; size: number }>> = [[]];
  let y = topY;

  lines.forEach((line) => {
    const wrappedCount = wrapLine(line.text, line.size >= 18 ? 48 : 86).length || 1;
    const needed = wrappedCount * (line.size >= 18 ? 22 : lineHeight);
    if (y - needed < 50 && pages[pages.length - 1].length > 0) {
      pages.push([]);
      y = topY;
    }

    pages[pages.length - 1].push(line);
    y -= needed;
  });

  return pages;
}

function buildLines(payload: KalkulackaPdfPayload) {
  const calculatorLabel = payload.calculatorType === 'fve' ? 'FVE + baterie' : 'BESS';
  const c = payload.calculations || {};
  const i = payload.inputs || {};
  const generatedAt = new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' });

  return [
    { text: 'BEETS - investicni shrnuti kalkulacky', size: 20 },
    { text: `${calculatorLabel} | vygenerovano ${generatedAt}`, size: 11 },
    { text: '', size: 11 },
    { text: 'Kontakt', size: 14 },
    { text: valueLine('Jmeno', payload.name) || '', size: 11 },
    { text: valueLine('Firma', payload.company) || '', size: 11 },
    { text: valueLine('Email', payload.email) || '', size: 11 },
    { text: valueLine('Telefon', payload.phone) || '', size: 11 },
    { text: '', size: 11 },
    { text: 'Hlavni vysledky', size: 14 },
    { text: valueLine('Navratnost', formatNumber(c.simplePayback, 1), 'let') || '', size: 11 },
    { text: valueLine('IRR', formatNumber(c.irr, 1), '%') || '', size: 11 },
    { text: valueLine('Celkove rocni prinosy', formatCurrency(c.netRevenue ?? c.annualBenefit)) || '', size: 11 },
    { text: valueLine('Rocni vyroba FVE', formatNumber(c.annualProduction), 'kWh') || '', size: 11 },
    { text: valueLine('Rocni uspora z prime spotreby FVE', formatCurrency(c.annualSavings)) || '', size: 11 },
    { text: valueLine('Rocni vynosy z pretoku FVE', formatCurrency(c.annualExportRevenue)) || '', size: 11 },
    { text: valueLine('Rocni prinos baterie', formatCurrency(c.batteryBenefit)) || '', size: 11 },
    { text: '', size: 11 },
    { text: 'Investice', size: 14 },
    { text: valueLine('Investicni naklady', formatCurrency(c.grossCapex)) || '', size: 11 },
    { text: valueLine('Dotace', formatCurrency(c.subsidyAmount)) || '', size: 11 },
    { text: valueLine('Ocekavane vlastni zdroje', formatCurrency(c.equityNeeded)) || '', size: 11 },
    { text: '', size: 11 },
    { text: 'Vstupy modelu', size: 14 },
    { text: valueLine('Velikost FVE', formatNumber(Number(i.systemSizeKw), 0), 'kWp') || '', size: 11 },
    { text: valueLine('Rocni spotreba', formatNumber(Number(i.annualConsumptionMwh), 1), 'MWh') || '', size: 11 },
    { text: valueLine('Baterie', i.useBattery) || '', size: 11 },
    { text: valueLine('Kapacita baterie', formatNumber(Number(i.capacity), 0), 'kWh') || '', size: 11 },
    { text: valueLine('Vykon baterie', formatNumber(Number(i.batteryPowerKw), 0), 'kW') || '', size: 11 },
    { text: valueLine('Scenar baterie', i.batteryScenario) || '', size: 11 },
    { text: valueLine('Napetova hladina', i.voltageLevel) || '', size: 11 },
    { text: valueLine('Frekvence spicek', i.peakFrequency) || '', size: 11 },
    { text: valueLine('Nakupni cena energie', formatNumber(Number(i.powerPriceKwh), 1), 'Kc/kWh') || '', size: 11 },
    { text: valueLine('Distribuce', formatNumber(Number(i.distributionPriceKwh), 1), 'Kc/kWh') || '', size: 11 },
    { text: valueLine('Vykupni cena', formatNumber(Number(i.feedInPriceKwh), 1), 'Kc/kWh') || '', size: 11 },
    { text: valueLine('Dotace', formatNumber(Number(i.subsidyPct), 0), '%') || '', size: 11 },
    { text: '', size: 11 },
    { text: 'Kontrolni hodnoty', size: 14 },
    { text: valueLine('Zakladni vlastni spotreba FVE', formatNumber(c.selfConsumedEnergy), 'kWh') || '', size: 11 },
    { text: valueLine('Pretoky FVE bez baterie', formatNumber(c.exportedEnergy), 'kWh') || '', size: 11 },
    { text: valueLine('Potrebne seriznuti spicky', formatNumber(c.neededPeakCutKw), 'kW') || '', size: 11 },
    { text: valueLine('Realne seriznutelne spicky baterii', formatNumber(c.achievablePeakCutKw), 'kW') || '', size: 11 },
    { text: valueLine('Energie posunuta baterii - self-consumption', formatNumber(c.shiftedSelfConsumptionKwh), 'kWh') || '', size: 11 },
    { text: valueLine('Energie posunuta baterii - volatilita', formatNumber(c.shiftedVolatilityKwh), 'kWh') || '', size: 11 },
    { text: '', size: 11 },
    { text: 'Poznamka: Vypocet je orientacni modelovy odhad podle nastaveni kalkulacky. Detailni nabidka vyzaduje technicke posouzeni objektu, profilu spotreby a finalni ceny technologie.', size: 10 },
  ].filter((line) => line.text !== '');
}

export function buildKalkulackaPdf(payload: KalkulackaPdfPayload) {
  const pages = paginate(buildLines(payload));
  const contentObjectStart = 4 + pages.length;
  const pageRefs = pages.map((_, index) => `${3 + index} 0 R`).join(' ');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>`,
    ...pages.map(
      (_, index) =>
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${3 + pages.length} 0 R >> >> /Contents ${contentObjectStart + index} 0 R >>`,
    ),
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ...pages.map((pageLines) => {
      const pageContent = renderPage(pageLines);
      return `<< /Length ${Buffer.byteLength(pageContent, 'ascii')} >>\nstream\n${pageContent}\nendstream`;
    }),
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'ascii'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'ascii');
}
