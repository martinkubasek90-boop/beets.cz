export type FveAdminConfig = {
  calculatorDefaults: {
    systemSizeKw: number;
    annualProductionPerKw: number;
    selfConsumptionPct: number;
    powerPrice: number;
    distributionPrice: number;
    sellPrice: number;
    subsidyPct: number;
    advancedSettings: {
      capexPerKw: number;
      additionalCosts: number;
    };
  };
  leadCapture: {
    pdfTitle: string;
    pdfSubtitle: string;
    analysisTitle: string;
    analysisSubtitle: string;
    pdfSuccessTitle: string;
    pdfSuccessMessage: string;
    analysisSuccessTitle: string;
    analysisSuccessMessage: string;
    consentNote: string;
  };
};

export const defaultFveAdminConfig: FveAdminConfig = {
  calculatorDefaults: {
    systemSizeKw: 100,
    annualProductionPerKw: 1000,
    selfConsumptionPct: 50,
    powerPrice: 3,
    distributionPrice: 1,
    sellPrice: 1.6,
    subsidyPct: 0,
    advancedSettings: {
      capexPerKw: 25000,
      additionalCosts: 0,
    },
  },
  leadCapture: {
    pdfTitle: 'Stáhnout investiční shrnutí',
    pdfSubtitle: 'Pošleme vám PDF na email',
    analysisTitle: 'Požádat o investiční posouzení',
    analysisSubtitle: 'Ozveme se vám do 24 hodin',
    pdfSuccessTitle: 'PDF bylo odesláno!',
    pdfSuccessMessage: 'Zkontrolujte prosím svou emailovou schránku.',
    analysisSuccessTitle: 'Děkujeme za váš zájem!',
    analysisSuccessMessage: 'Ozveme se vám do 24 hodin s detailní analýzou.',
    consentNote: 'Odesláním souhlasíte se zpracováním osobních údajů pro účely komunikace.',
  },
};

function toNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function mergeFveAdminConfig(raw: unknown): FveAdminConfig {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, any>) : {};
  const calc = source.calculatorDefaults || {};
  const advanced = calc.advancedSettings || {};
  const lead = source.leadCapture || {};

  return {
    calculatorDefaults: {
      systemSizeKw: toNumber(calc.systemSizeKw, defaultFveAdminConfig.calculatorDefaults.systemSizeKw),
      annualProductionPerKw: toNumber(calc.annualProductionPerKw, defaultFveAdminConfig.calculatorDefaults.annualProductionPerKw),
      selfConsumptionPct: toNumber(calc.selfConsumptionPct, defaultFveAdminConfig.calculatorDefaults.selfConsumptionPct),
      powerPrice: toNumber(calc.powerPrice, defaultFveAdminConfig.calculatorDefaults.powerPrice),
      distributionPrice: toNumber(calc.distributionPrice, defaultFveAdminConfig.calculatorDefaults.distributionPrice),
      sellPrice: toNumber(calc.sellPrice, defaultFveAdminConfig.calculatorDefaults.sellPrice),
      subsidyPct: toNumber(calc.subsidyPct, defaultFveAdminConfig.calculatorDefaults.subsidyPct),
      advancedSettings: {
        capexPerKw: toNumber(advanced.capexPerKw, defaultFveAdminConfig.calculatorDefaults.advancedSettings.capexPerKw),
        additionalCosts: toNumber(
          advanced.additionalCosts,
          defaultFveAdminConfig.calculatorDefaults.advancedSettings.additionalCosts,
        ),
      },
    },
    leadCapture: {
      pdfTitle: toString(lead.pdfTitle, defaultFveAdminConfig.leadCapture.pdfTitle),
      pdfSubtitle: toString(lead.pdfSubtitle, defaultFveAdminConfig.leadCapture.pdfSubtitle),
      analysisTitle: toString(lead.analysisTitle, defaultFveAdminConfig.leadCapture.analysisTitle),
      analysisSubtitle: toString(lead.analysisSubtitle, defaultFveAdminConfig.leadCapture.analysisSubtitle),
      pdfSuccessTitle: toString(lead.pdfSuccessTitle, defaultFveAdminConfig.leadCapture.pdfSuccessTitle),
      pdfSuccessMessage: toString(lead.pdfSuccessMessage, defaultFveAdminConfig.leadCapture.pdfSuccessMessage),
      analysisSuccessTitle: toString(lead.analysisSuccessTitle, defaultFveAdminConfig.leadCapture.analysisSuccessTitle),
      analysisSuccessMessage: toString(lead.analysisSuccessMessage, defaultFveAdminConfig.leadCapture.analysisSuccessMessage),
      consentNote: toString(lead.consentNote, defaultFveAdminConfig.leadCapture.consentNote),
    },
  };
}

