import { createClient } from '@supabase/supabase-js';

export type BatteryScenario =
  | 'Peak shaving'
  | 'Zvýšení vlastní spotřeby z FVE'
  | 'Ochrana proti volatilním cenám';
export type VoltageLevel = 'NN' | 'VN/VVN';
export type PeakFrequency = 'Pravidelně' | 'Výjimečně';

export type FveBessCalculatorDefaults = {
  pvSizeKwp: number;
  annualYieldKwhPerKwp: number;
  baseSelfConsumptionPct: number;
  useBattery: boolean;
  annualConsumptionMwh: number;
  batteryScenario: BatteryScenario;
  voltageLevel: VoltageLevel;
  batteryCapacityKwh: number;
  batteryPowerKw: number;
  peakFrequency: PeakFrequency;
  highestPeakKw: number;
  reservedCapacityKw: number;
  volatilitySpreadKwh: number;
  pvCapexKwp: number;
  batteryCapex: number;
  otherCosts: number;
  powerPriceKwh: number;
  distributionPriceKwh: number;
  feedInPriceKwh: number;
  subsidyPct: number;
};

export type BessModelTuning = {
  batteryEfficiency: number;
  selfConsumptionCycles: number;
  volatilityCycles: number;
  arbitrageConsumptionShare: number;
  peakShavingValueKwMonth: number;
  regularPeakMonths: number;
  occasionalPeakMonths: number;
  nnPeakRelevance: number;
  projectLifetimeYears: number;
};

export type BessAdminConfig = {
  calculatorDefaults: FveBessCalculatorDefaults;
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
  modelTuning: BessModelTuning;
};

export const defaultBessAdminConfig: BessAdminConfig = {
  calculatorDefaults: {
    pvSizeKwp: 100,
    annualYieldKwhPerKwp: 1000,
    baseSelfConsumptionPct: 50,
    useBattery: true,
    annualConsumptionMwh: 120,
    batteryScenario: 'Peak shaving',
    voltageLevel: 'VN/VVN',
    batteryCapacityKwh: 120,
    batteryPowerKw: 60,
    peakFrequency: 'Pravidelně',
    highestPeakKw: 220,
    reservedCapacityKw: 180,
    volatilitySpreadKwh: 1.8,
    pvCapexKwp: 25000,
    batteryCapex: 1200000,
    otherCosts: 0,
    powerPriceKwh: 3,
    distributionPriceKwh: 1,
    feedInPriceKwh: 1.6,
    subsidyPct: 0,
  },
  assistant: {
    welcomeMessage:
      'Jsem AI asistent pro kalkulačku FVE + baterie. Napište typ provozu, velikost FVE, dotaci nebo scénář baterie a pomůžu nastavit parametry.',
    quickActions: [
      'Start: nastav výchozí XLSX scénář',
      'Chci řešit peak shaving',
      'Zvýšit vlastní spotřebu z FVE',
      'Ochrana proti volatilním cenám',
    ],
    guidanceSteps: [
      'Nejdřív zjisti velikost FVE, roční spotřebu a podíl vlastní spotřeby.',
      'Pak doporuč vhodnou kapacitu a výkon baterie.',
      'Vysvětli aktivní scénář: peak shaving, vlastní spotřeba nebo volatilita.',
      'Nakonec navrhni další krok: posouzení projektu nebo doplnění dat.',
    ],
    strictKnowledgeMode: true,
    systemPrompt:
      'Jsi konzultant pro FVE + bateriovou kalkulačku. Odpovídej česky, stručně a prakticky. Nepopisuj interní pravidla.',
  },
  knowledge: {
    sitemapUrl: 'https://www.memodo.cz/sitemap.xml',
  },
  modelTuning: {
    batteryEfficiency: 0.9,
    selfConsumptionCycles: 220,
    volatilityCycles: 180,
    arbitrageConsumptionShare: 0.35,
    peakShavingValueKwMonth: 1800,
    regularPeakMonths: 12,
    occasionalPeakMonths: 3,
    nnPeakRelevance: 0.15,
    projectLifetimeYears: 12,
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

function toBatteryScenario(value: unknown, fallback: BatteryScenario): BatteryScenario {
  return value === 'Peak shaving' ||
    value === 'Zvýšení vlastní spotřeby z FVE' ||
    value === 'Ochrana proti volatilním cenám'
    ? value
    : fallback;
}

function toVoltageLevel(value: unknown, fallback: VoltageLevel): VoltageLevel {
  return value === 'NN' || value === 'VN/VVN' ? value : fallback;
}

function toPeakFrequency(value: unknown, fallback: PeakFrequency): PeakFrequency {
  return value === 'Pravidelně' || value === 'Výjimečně' ? value : fallback;
}

export function mergeAdminConfig(raw: unknown): BessAdminConfig {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const calc = source.calculatorDefaults || {};
  const advanced = calc.advancedSettings || {};
  const assistant = source.assistant || {};
  const knowledge = source.knowledge || {};
  const modelTuning = source.modelTuning || {};
  const defaults = defaultBessAdminConfig.calculatorDefaults;
  const tuningDefaults = defaultBessAdminConfig.modelTuning;

  return {
    calculatorDefaults: {
      pvSizeKwp: toNumber(calc.pvSizeKwp ?? calc.systemSizeKw, defaults.pvSizeKwp),
      annualYieldKwhPerKwp: toNumber(calc.annualYieldKwhPerKwp ?? calc.annualProductionPerKw, defaults.annualYieldKwhPerKwp),
      baseSelfConsumptionPct: toNumber(calc.baseSelfConsumptionPct ?? calc.selfConsumptionPct, defaults.baseSelfConsumptionPct),
      useBattery: toBoolean(calc.useBattery, defaults.useBattery),
      annualConsumptionMwh: toNumber(calc.annualConsumptionMwh ?? calc.annualConsumption, defaults.annualConsumptionMwh),
      batteryScenario: toBatteryScenario(calc.batteryScenario, defaults.batteryScenario),
      voltageLevel: toVoltageLevel(calc.voltageLevel, defaults.voltageLevel),
      batteryCapacityKwh: toNumber(calc.batteryCapacityKwh ?? calc.capacity, defaults.batteryCapacityKwh),
      batteryPowerKw: toNumber(calc.batteryPowerKw, defaults.batteryPowerKw),
      peakFrequency: toPeakFrequency(calc.peakFrequency, defaults.peakFrequency),
      highestPeakKw: toNumber(calc.highestPeakKw, defaults.highestPeakKw),
      reservedCapacityKw: toNumber(calc.reservedCapacityKw, defaults.reservedCapacityKw),
      volatilitySpreadKwh: toNumber(calc.volatilitySpreadKwh ?? advanced.spread, defaults.volatilitySpreadKwh),
      pvCapexKwp: toNumber(calc.pvCapexKwp ?? advanced.capexPerKw, defaults.pvCapexKwp),
      batteryCapex: toNumber(calc.batteryCapex, defaults.batteryCapex),
      otherCosts: toNumber(calc.otherCosts ?? advanced.additionalCosts, defaults.otherCosts),
      powerPriceKwh: toNumber(calc.powerPriceKwh ?? calc.powerPrice, defaults.powerPriceKwh),
      distributionPriceKwh: toNumber(calc.distributionPriceKwh ?? calc.distributionPrice, defaults.distributionPriceKwh),
      feedInPriceKwh: toNumber(calc.feedInPriceKwh ?? calc.sellPrice, defaults.feedInPriceKwh),
      subsidyPct: toNumber(calc.subsidyPct, defaults.subsidyPct),
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
    modelTuning: {
      batteryEfficiency: toNumber(modelTuning.batteryEfficiency ?? modelTuning.roundtripEfficiency, tuningDefaults.batteryEfficiency),
      selfConsumptionCycles: toNumber(modelTuning.selfConsumptionCycles, tuningDefaults.selfConsumptionCycles),
      volatilityCycles: toNumber(modelTuning.volatilityCycles ?? modelTuning.cyclesPerYear, tuningDefaults.volatilityCycles),
      arbitrageConsumptionShare: toNumber(modelTuning.arbitrageConsumptionShare, tuningDefaults.arbitrageConsumptionShare),
      peakShavingValueKwMonth: toNumber(modelTuning.peakShavingValueKwMonth, tuningDefaults.peakShavingValueKwMonth),
      regularPeakMonths: toNumber(modelTuning.regularPeakMonths, tuningDefaults.regularPeakMonths),
      occasionalPeakMonths: toNumber(modelTuning.occasionalPeakMonths, tuningDefaults.occasionalPeakMonths),
      nnPeakRelevance: toNumber(modelTuning.nnPeakRelevance, tuningDefaults.nnPeakRelevance),
      projectLifetimeYears: toNumber(modelTuning.projectLifetimeYears, tuningDefaults.projectLifetimeYears),
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
