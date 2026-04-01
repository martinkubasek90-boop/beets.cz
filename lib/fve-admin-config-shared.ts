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
  modelTuning: {
    riskPaybackLowYears: number;
    riskPaybackMediumYears: number;
    confidenceBaseScore: number;
    confidenceSelfConsumptionMediumThreshold: number;
    confidenceSelfConsumptionHighThreshold: number;
    confidenceSelfConsumptionMediumBonus: number;
    confidenceSelfConsumptionHighBonus: number;
    confidenceSelfConsumptionLowBonus: number;
    confidenceSubsidyLowBonus: number;
    confidenceSubsidyHighThreshold: number;
    confidenceSubsidyHighBonus: number;
    confidencePurchasePriceThreshold: number;
    confidencePurchasePriceBonus: number;
    confidenceCapexThreshold: number;
    confidenceCapexBonus: number;
    confidencePaybackMediumPenaltyThreshold: number;
    confidencePaybackHighPenaltyThreshold: number;
    confidencePaybackMediumPenalty: number;
    confidencePaybackHighPenalty: number;
    confidenceMin: number;
    confidenceMax: number;
    lowSelfConsumptionHintThreshold: number;
    highCapexHintThreshold: number;
    highAdditionalCostsHintThreshold: number;
    compareDefaults: {
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
  modelTuning: {
    riskPaybackLowYears: 7,
    riskPaybackMediumYears: 10,
    confidenceBaseScore: 55,
    confidenceSelfConsumptionMediumThreshold: 45,
    confidenceSelfConsumptionHighThreshold: 65,
    confidenceSelfConsumptionMediumBonus: 10,
    confidenceSelfConsumptionHighBonus: 16,
    confidenceSelfConsumptionLowBonus: 4,
    confidenceSubsidyLowBonus: 5,
    confidenceSubsidyHighThreshold: 20,
    confidenceSubsidyHighBonus: 10,
    confidencePurchasePriceThreshold: 5,
    confidencePurchasePriceBonus: 8,
    confidenceCapexThreshold: 25000,
    confidenceCapexBonus: 7,
    confidencePaybackMediumPenaltyThreshold: 9,
    confidencePaybackHighPenaltyThreshold: 12,
    confidencePaybackMediumPenalty: 10,
    confidencePaybackHighPenalty: 20,
    confidenceMin: 35,
    confidenceMax: 95,
    lowSelfConsumptionHintThreshold: 30,
    highCapexHintThreshold: 30000,
    highAdditionalCostsHintThreshold: 500000,
    compareDefaults: {
      systemSizeKw: 120,
      annualProductionPerKw: 1000,
      selfConsumptionPct: 60,
      powerPrice: 3,
      distributionPrice: 1,
      sellPrice: 1.6,
      subsidyPct: 20,
      advancedSettings: {
        capexPerKw: 25000,
        additionalCosts: 0,
      },
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
  const tuning = source.modelTuning || {};
  const compareDefaults = tuning.compareDefaults || {};
  const compareAdvanced = compareDefaults.advancedSettings || {};
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
    modelTuning: {
      riskPaybackLowYears: toNumber(tuning.riskPaybackLowYears, defaultFveAdminConfig.modelTuning.riskPaybackLowYears),
      riskPaybackMediumYears: toNumber(tuning.riskPaybackMediumYears, defaultFveAdminConfig.modelTuning.riskPaybackMediumYears),
      confidenceBaseScore: toNumber(tuning.confidenceBaseScore, defaultFveAdminConfig.modelTuning.confidenceBaseScore),
      confidenceSelfConsumptionMediumThreshold: toNumber(
        tuning.confidenceSelfConsumptionMediumThreshold,
        defaultFveAdminConfig.modelTuning.confidenceSelfConsumptionMediumThreshold,
      ),
      confidenceSelfConsumptionHighThreshold: toNumber(
        tuning.confidenceSelfConsumptionHighThreshold,
        defaultFveAdminConfig.modelTuning.confidenceSelfConsumptionHighThreshold,
      ),
      confidenceSelfConsumptionMediumBonus: toNumber(
        tuning.confidenceSelfConsumptionMediumBonus,
        defaultFveAdminConfig.modelTuning.confidenceSelfConsumptionMediumBonus,
      ),
      confidenceSelfConsumptionHighBonus: toNumber(
        tuning.confidenceSelfConsumptionHighBonus,
        defaultFveAdminConfig.modelTuning.confidenceSelfConsumptionHighBonus,
      ),
      confidenceSelfConsumptionLowBonus: toNumber(
        tuning.confidenceSelfConsumptionLowBonus,
        defaultFveAdminConfig.modelTuning.confidenceSelfConsumptionLowBonus,
      ),
      confidenceSubsidyLowBonus: toNumber(
        tuning.confidenceSubsidyLowBonus,
        defaultFveAdminConfig.modelTuning.confidenceSubsidyLowBonus,
      ),
      confidenceSubsidyHighThreshold: toNumber(
        tuning.confidenceSubsidyHighThreshold,
        defaultFveAdminConfig.modelTuning.confidenceSubsidyHighThreshold,
      ),
      confidenceSubsidyHighBonus: toNumber(
        tuning.confidenceSubsidyHighBonus,
        defaultFveAdminConfig.modelTuning.confidenceSubsidyHighBonus,
      ),
      confidencePurchasePriceThreshold: toNumber(
        tuning.confidencePurchasePriceThreshold,
        defaultFveAdminConfig.modelTuning.confidencePurchasePriceThreshold,
      ),
      confidencePurchasePriceBonus: toNumber(
        tuning.confidencePurchasePriceBonus,
        defaultFveAdminConfig.modelTuning.confidencePurchasePriceBonus,
      ),
      confidenceCapexThreshold: toNumber(tuning.confidenceCapexThreshold, defaultFveAdminConfig.modelTuning.confidenceCapexThreshold),
      confidenceCapexBonus: toNumber(tuning.confidenceCapexBonus, defaultFveAdminConfig.modelTuning.confidenceCapexBonus),
      confidencePaybackMediumPenaltyThreshold: toNumber(
        tuning.confidencePaybackMediumPenaltyThreshold,
        defaultFveAdminConfig.modelTuning.confidencePaybackMediumPenaltyThreshold,
      ),
      confidencePaybackHighPenaltyThreshold: toNumber(
        tuning.confidencePaybackHighPenaltyThreshold,
        defaultFveAdminConfig.modelTuning.confidencePaybackHighPenaltyThreshold,
      ),
      confidencePaybackMediumPenalty: toNumber(
        tuning.confidencePaybackMediumPenalty,
        defaultFveAdminConfig.modelTuning.confidencePaybackMediumPenalty,
      ),
      confidencePaybackHighPenalty: toNumber(
        tuning.confidencePaybackHighPenalty,
        defaultFveAdminConfig.modelTuning.confidencePaybackHighPenalty,
      ),
      confidenceMin: toNumber(tuning.confidenceMin, defaultFveAdminConfig.modelTuning.confidenceMin),
      confidenceMax: toNumber(tuning.confidenceMax, defaultFveAdminConfig.modelTuning.confidenceMax),
      lowSelfConsumptionHintThreshold: toNumber(
        tuning.lowSelfConsumptionHintThreshold,
        defaultFveAdminConfig.modelTuning.lowSelfConsumptionHintThreshold,
      ),
      highCapexHintThreshold: toNumber(tuning.highCapexHintThreshold, defaultFveAdminConfig.modelTuning.highCapexHintThreshold),
      highAdditionalCostsHintThreshold: toNumber(
        tuning.highAdditionalCostsHintThreshold,
        defaultFveAdminConfig.modelTuning.highAdditionalCostsHintThreshold,
      ),
      compareDefaults: {
        systemSizeKw: toNumber(compareDefaults.systemSizeKw, defaultFveAdminConfig.modelTuning.compareDefaults.systemSizeKw),
        annualProductionPerKw: toNumber(
          compareDefaults.annualProductionPerKw,
          defaultFveAdminConfig.modelTuning.compareDefaults.annualProductionPerKw,
        ),
        selfConsumptionPct: toNumber(
          compareDefaults.selfConsumptionPct,
          defaultFveAdminConfig.modelTuning.compareDefaults.selfConsumptionPct,
        ),
        powerPrice: toNumber(compareDefaults.powerPrice, defaultFveAdminConfig.modelTuning.compareDefaults.powerPrice),
        distributionPrice: toNumber(
          compareDefaults.distributionPrice,
          defaultFveAdminConfig.modelTuning.compareDefaults.distributionPrice,
        ),
        sellPrice: toNumber(compareDefaults.sellPrice, defaultFveAdminConfig.modelTuning.compareDefaults.sellPrice),
        subsidyPct: toNumber(compareDefaults.subsidyPct, defaultFveAdminConfig.modelTuning.compareDefaults.subsidyPct),
        advancedSettings: {
          capexPerKw: toNumber(
            compareAdvanced.capexPerKw,
            defaultFveAdminConfig.modelTuning.compareDefaults.advancedSettings.capexPerKw,
          ),
          additionalCosts: toNumber(
            compareAdvanced.additionalCosts,
            defaultFveAdminConfig.modelTuning.compareDefaults.advancedSettings.additionalCosts,
          ),
        },
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
