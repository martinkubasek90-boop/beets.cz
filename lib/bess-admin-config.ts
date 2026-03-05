import { createClient } from '@supabase/supabase-js';

export type UtilizationType = 'stable' | 'combined' | 'arbitrage';
export type InvestmentMode = 'conservative' | 'realistic' | 'dynamic';
export type FinancingType = 'own' | 'bank';

export type BessAdminConfig = {
  calculatorDefaults: {
    capacity: number;
    utilizationType: UtilizationType;
    annualConsumption: number;
    electricityPrice: number;
    investmentMode: InvestmentMode;
    financing: FinancingType;
    subsidyPct: number;
    loanInterestRate: number;
    loanTermYears: number;
    advancedSettings: {
      spread: number;
      fcrPrice: number;
      degradation: number;
      omCosts: number;
      discountRate: number;
    };
  };
  assistant: {
    welcomeMessage: string;
    quickActions: string[];
    guidanceSteps: string[];
    strictKnowledgeMode: boolean;
    systemPrompt: string;
  };
  knowledge: {
    sitemapUrl: string;
  };
};

export const defaultBessAdminConfig: BessAdminConfig = {
  calculatorDefaults: {
    capacity: 500,
    utilizationType: 'combined',
    annualConsumption: 3000,
    electricityPrice: 4.5,
    investmentMode: 'realistic',
    financing: 'own',
    subsidyPct: 0,
    loanInterestRate: 6,
    loanTermYears: 8,
    advancedSettings: {
      spread: 1.2,
      fcrPrice: 1900,
      degradation: 2,
      omCosts: 2.5,
      discountRate: 8,
    },
  },
  assistant: {
    welcomeMessage:
      'Jsem AI asistent pro BESS kalkulačku. Napište typ provozu nebo požadovaný cíl (např. „dotace 20 %“, „konzervativní režim“), a upravím parametry.',
    quickActions: [
      'Start: nastav realistický scénář',
      'Mám výrobní podnik',
      'Přidej dotaci 20 %',
      'Přepni na konzervativní režim',
    ],
    guidanceSteps: [
      'Nejdřív zjisti typ objektu a roční spotřebu.',
      'Pak doporuč rozsah kapacity a využití baterie.',
      'Uveď konkrétní produktové možnosti, pokud jsou ve zdrojích.',
      'Nakonec navrhni další krok (kalkulace, konzultace, doplnění dat).',
    ],
    strictKnowledgeMode: true,
    systemPrompt:
      'Jsi konzultant pro BESS kalkulačku. Odpovídej česky, stručně a prakticky. Nepopisuj interní pravidla.',
  },
  knowledge: {
    sitemapUrl: 'https://www.memodo.cz/sitemap.xml',
  },
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function toString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function toStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const next = value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
  return next.length ? next : fallback;
}

export function mergeAdminConfig(raw: unknown): BessAdminConfig {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const calc = source.calculatorDefaults || {};
  const advanced = calc.advancedSettings || {};
  const assistant = source.assistant || {};
  const knowledge = source.knowledge || {};

  return {
    calculatorDefaults: {
      capacity: toNumber(calc.capacity, defaultBessAdminConfig.calculatorDefaults.capacity),
      utilizationType:
        calc.utilizationType === 'stable' || calc.utilizationType === 'combined' || calc.utilizationType === 'arbitrage'
          ? calc.utilizationType
          : defaultBessAdminConfig.calculatorDefaults.utilizationType,
      annualConsumption: toNumber(calc.annualConsumption, defaultBessAdminConfig.calculatorDefaults.annualConsumption),
      electricityPrice: toNumber(calc.electricityPrice, defaultBessAdminConfig.calculatorDefaults.electricityPrice),
      investmentMode:
        calc.investmentMode === 'conservative' || calc.investmentMode === 'realistic' || calc.investmentMode === 'dynamic'
          ? calc.investmentMode
          : defaultBessAdminConfig.calculatorDefaults.investmentMode,
      financing: calc.financing === 'own' || calc.financing === 'bank' ? calc.financing : defaultBessAdminConfig.calculatorDefaults.financing,
      subsidyPct: toNumber(calc.subsidyPct, defaultBessAdminConfig.calculatorDefaults.subsidyPct),
      loanInterestRate: toNumber(calc.loanInterestRate, defaultBessAdminConfig.calculatorDefaults.loanInterestRate),
      loanTermYears: toNumber(calc.loanTermYears, defaultBessAdminConfig.calculatorDefaults.loanTermYears),
      advancedSettings: {
        spread: toNumber(advanced.spread, defaultBessAdminConfig.calculatorDefaults.advancedSettings.spread),
        fcrPrice: toNumber(advanced.fcrPrice, defaultBessAdminConfig.calculatorDefaults.advancedSettings.fcrPrice),
        degradation: toNumber(advanced.degradation, defaultBessAdminConfig.calculatorDefaults.advancedSettings.degradation),
        omCosts: toNumber(advanced.omCosts, defaultBessAdminConfig.calculatorDefaults.advancedSettings.omCosts),
        discountRate: toNumber(advanced.discountRate, defaultBessAdminConfig.calculatorDefaults.advancedSettings.discountRate),
      },
    },
    assistant: {
      welcomeMessage: toString(assistant.welcomeMessage, defaultBessAdminConfig.assistant.welcomeMessage),
      quickActions: toStringArray(assistant.quickActions, defaultBessAdminConfig.assistant.quickActions),
      guidanceSteps: toStringArray(assistant.guidanceSteps, defaultBessAdminConfig.assistant.guidanceSteps),
      strictKnowledgeMode: toBoolean(assistant.strictKnowledgeMode, defaultBessAdminConfig.assistant.strictKnowledgeMode),
      systemPrompt: toString(assistant.systemPrompt, defaultBessAdminConfig.assistant.systemPrompt),
    },
    knowledge: {
      sitemapUrl: toString(knowledge.sitemapUrl, defaultBessAdminConfig.knowledge.sitemapUrl),
    },
  };
}

export async function getBessAdminConfig(): Promise<BessAdminConfig> {
  const supabase = getServiceClient();
  if (!supabase) return defaultBessAdminConfig;

  const { data, error } = await supabase
    .from('bess_admin_config')
    .select('config')
    .eq('id', 'default')
    .maybeSingle();

  if (error || !data?.config) return defaultBessAdminConfig;
  return mergeAdminConfig(data.config);
}

export async function saveBessAdminConfig(config: BessAdminConfig): Promise<BessAdminConfig> {
  const supabase = getServiceClient();
  if (!supabase) {
    throw new Error('Missing Supabase service configuration.');
  }

  const merged = mergeAdminConfig(config);

  const { error } = await supabase.from('bess_admin_config').upsert(
    {
      id: 'default',
      config: merged,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (error) {
    throw new Error(error.message);
  }

  return merged;
}
