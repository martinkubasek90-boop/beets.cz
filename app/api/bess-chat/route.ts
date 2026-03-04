import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type UtilizationType = 'stable' | 'combined' | 'arbitrage';
type InvestmentMode = 'conservative' | 'realistic' | 'dynamic';
type FinancingType = 'own' | 'bank';

type ChatContext = {
  capacity?: number;
  utilizationType?: UtilizationType;
  annualConsumption?: number;
  electricityPrice?: number;
  investmentMode?: InvestmentMode;
  financing?: FinancingType;
  subsidyPct?: number;
  loanInterestRate?: number;
  loanTermYears?: number;
  spread?: number;
  fcrPrice?: number;
  degradation?: number;
  omCosts?: number;
};

type ChatRequest = {
  message?: string;
  context?: ChatContext;
};

type AssistantPatch = Partial<{
  capacity: number;
  utilizationType: UtilizationType;
  annualConsumption: number;
  electricityPrice: number;
  investmentMode: InvestmentMode;
  financing: FinancingType;
  subsidyPct: number;
  loanInterestRate: number;
  loanTermYears: number;
  spread: number;
  fcrPrice: number;
  degradation: number;
  omCosts: number;
}>;

type ChatResponse = {
  reply: string;
  suggestions: string[];
  patch?: AssistantPatch;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const extractPercent = (text: string) => {
  const match = text.match(/(\d{1,2})\s*%/);
  return match ? Number(match[1]) : null;
};

const extractNumber = (text: string) => {
  const match = text.match(/\d+(?:[\.,]\d+)?/);
  return match ? Number(match[0].replace(',', '.')) : null;
};

function buildResponse(message: string, context: ChatContext): ChatResponse {
  const q = message.toLowerCase();

  if (q.includes('start') || q.includes('zač') || q.includes('default')) {
    return {
      reply:
        'Nastavil jsem realistický výchozí scénář pro C&I: kombinované využití, realistický investiční režim a střední spotřebu. Odtud se dobře ladí podle vašeho provozu.',
      suggestions: [
        'Mám výrobní závod s vysokým odběrem',
        'Chci konzervativní variantu',
        'Jak moc pomůže dotace?',
      ],
      patch: {
        capacity: 2000,
        utilizationType: 'combined',
        annualConsumption: 6000,
        electricityPrice: 5.2,
        investmentMode: 'realistic',
        financing: 'own',
        subsidyPct: 0,
        spread: 1.2,
        fcrPrice: 1900,
        degradation: 2,
        omCosts: 2.5,
      },
    };
  }

  if (q.includes('výrob') || q.includes('fabr') || q.includes('průmysl')) {
    return {
      reply:
        'Pro výrobní podnik dává většinou smysl vyšší kapacita a kombinovaný režim, aby se spojil FCR výnos a arbitráž. Nastavil jsem variantu vhodnou pro vyšší odběr.',
      suggestions: [
        'Přepni na konzervativní režim',
        'Přidej bankovní financování',
        'Vysvětli mi spread arbitráže',
      ],
      patch: {
        capacity: 2500,
        annualConsumption: Math.max(8000, context.annualConsumption ?? 0),
        utilizationType: 'combined',
        electricityPrice: Math.max(5.5, context.electricityPrice ?? 0),
      },
    };
  }

  if (q.includes('logist')) {
    return {
      reply:
        'Pro logistiku je obvykle dobrý kompromis střední kapacita, kombinované využití a postupné ladění podle denní špičky a dobíjení.',
      suggestions: ['Zkusit nižší CAPEX variantu', 'Chci vyšší výnos i za cenu rizika', 'Přidat dotaci 20 %'],
      patch: {
        capacity: 1800,
        annualConsumption: Math.max(4500, context.annualConsumption ?? 0),
        utilizationType: 'combined',
      },
    };
  }

  if (q.includes('retail') || q.includes('obchod') || q.includes('oc')) {
    return {
      reply:
        'U retailu bývá vhodné držet stabilnější profil příjmů. Nastavil jsem konzervativnější variantu s důrazem na predikovatelnost.',
      suggestions: ['Jak zkrátit návratnost?', 'Přidej dotaci 30 %', 'Přepni na vlastní kapitál'],
      patch: {
        capacity: 1200,
        utilizationType: 'stable',
        investmentMode: 'conservative',
        spread: 1.0,
        fcrPrice: 1700,
      },
    };
  }

  if (q.includes('konzerv')) {
    return {
      reply: 'Přepnul jsem model na konzervativní režim (nižší FCR cena a spread), aby byl výsledek robustnější.',
      suggestions: ['Přepni zpět na realistický', 'Jaký je rozdíl proti dynamickému?', 'Přidej dotaci 20 %'],
      patch: {
        investmentMode: 'conservative',
        spread: 1.0,
        fcrPrice: 1700,
      },
    };
  }

  if (q.includes('dynam')) {
    return {
      reply: 'Nastavil jsem dynamický režim. Model teď počítá vyšší výnosový potenciál, ale i vyšší citlivost na trh.',
      suggestions: ['Jak moc je to rizikové?', 'Sniž kapacitu pro nižší CAPEX', 'Porovnej s realistickým'],
      patch: {
        investmentMode: 'dynamic',
        utilizationType: 'arbitrage',
        spread: 1.5,
        fcrPrice: 2200,
      },
    };
  }

  if (q.includes('dotac')) {
    const pct = extractPercent(q);
    const subsidyPct = clamp(pct ?? 20, 0, 50);
    return {
      reply: `Nastavil jsem dotaci na ${subsidyPct} %. To sníží čistý CAPEX a obvykle zlepší dobu návratnosti.`,
      suggestions: ['A co při 0 % dotaci?', 'Přidat bankovní financování', 'Porovnat scénáře A/B'],
      patch: { subsidyPct },
    };
  }

  if (q.includes('úvěr') || q.includes('uver') || q.includes('bank')) {
    return {
      reply: 'Zapnul jsem 50% bankovní financování a nechal standardní sazbu i dobu splácení pro realistické porovnání IRR.',
      suggestions: ['Nastav úrok 5 %', 'Nastav úrok 7 %', 'Vrať na vlastní kapitál'],
      patch: {
        financing: 'bank',
        loanInterestRate: context.loanInterestRate ?? 6,
        loanTermYears: context.loanTermYears ?? 8,
      },
    };
  }

  if (q.includes('úrok') || q.includes('urok')) {
    const rate = extractNumber(q);
    if (rate !== null) {
      const loanInterestRate = clamp(rate, 3, 10);
      return {
        reply: `Nastavil jsem úrokovou sazbu na ${loanInterestRate.toFixed(1)} %.`,
        suggestions: ['Nastav úvěr na 8 let', 'Přepnout na vlastní kapitál', 'Jak to ovlivní IRR?'],
        patch: { financing: 'bank', loanInterestRate },
      };
    }
  }

  if (q.includes('kapacit')) {
    const cap = extractNumber(q);
    if (cap !== null) {
      const capacity = clamp(Math.round(cap / 100) * 100, 200, 5000);
      return {
        reply: `Nastavil jsem kapacitu na ${capacity.toLocaleString('cs-CZ')} kWh.`,
        suggestions: ['Porovnej s 2 000 kWh', 'Sniž CAPEX o 20 %', 'Přepni na kombinovaný režim'],
        patch: { capacity },
      };
    }
  }

  return {
    reply:
      'Pomůžu vám rychle nastavit model. Napište typ provozu (výroba/logistika/retail), požadovanou kapacitu nebo třeba „dotace 20 %“, a já parametry rovnou upravím.',
    suggestions: [
      'Start: nastav realistický scénář',
      'Mám výrobní podnik',
      'Přidej dotaci 20 %',
    ],
  };
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as ChatRequest;
  const message = payload.message?.trim();

  if (!message) {
    return NextResponse.json({ error: 'Chybí zpráva.' }, { status: 400 });
  }

  const response = buildResponse(message, payload.context ?? {});
  return NextResponse.json(response);
}
