/**
 * Centralized per-ticker configuration.
 * Each ticker has a base config; user overrides are applied to a deep-cloned reactive copy.
 * Part A: config shape without behavior change — values match existing defaults.
 */

// ─── NVDA ───────────────────────────────────────────────────────────────────
export const NVDA_CONFIG = {
  ticker: 'NVDA',
  metric: 'EPS',
  valuationMetric: 'EPS',
  baseValue: 4.77,  // normalized non-GAAP (not GAAP 4.90)
  baseValueLabel: 'FY2026 normalized non-GAAP EPS',
  forward: { y1: 8.98, y2: 12.79 },  // updated consensus estimates
  multipleBand: { min: 39.5, max: 58.9 },
  projectionGrowth: 33.6,
  capm: { rf: 0.0456, erp: 0.055, beta: 2.00 },  // d = 15.56%
  seedValues: [8.98, 12.79],  // FY2027, FY2028 consensus
  growthStages: [
    { years: 3, rate: 0.30 },   // years 3-5
    { years: 5, rate: 0.20 },   // years 6-10
  ],
  terminal: { growth: 0.15, years: 10 },
  revenueModel: { q1: 78, q2: 93.5, q3: 112.5, q4: 140 },
  priceFallback: 176.63,
  historicalMultiple: [
    { label: 'Current', value: 35.24 },
    { label: 'Jan 2026', value: 47.31 },
    { label: 'Oct 2025', value: 57.69 },
    { label: 'Jul 2025', value: 57.38 },
    { label: 'Apr 2025', value: 37.05 },
    { label: 'Jan 2025', value: 47.40 },
    { label: 'Oct 2024', value: 62.24 },
  ],
  sliderConfig: {
    sections: [
      {
        section: 'P/E Valuation',
        items: [
          { key: 'y1', label: '1-year forward EPS', min: 5, max: 15, step: 0.01, fmt: 'dlr' },
          { key: 'y2', label: '2-year forward EPS', min: 5, max: 20, step: 0.01, fmt: 'dlr' },
          { key: 'minMultiple', label: 'Min P/E multiple', min: 15, max: 80, step: 0.1, fmt: 'multiple' },
          { key: 'maxMultiple', label: 'Max P/E multiple', min: 15, max: 120, step: 0.1, fmt: 'multiple' },
          { key: 'projGrowth', label: 'Projection growth g', min: 10, max: 80, step: 0.1, fmt: 'percent' },
        ],
      },
      {
        section: 'Staged DCF (Advanced)',
        items: [
          { key: 'capmRf', label: 'Risk-free rate (rf)', min: 1, max: 8, step: 0.01, fmt: 'percent' },
          { key: 'capmErp', label: 'Equity risk premium', min: 2, max: 10, step: 0.1, fmt: 'percent' },
          { key: 'capmBeta', label: 'Beta', min: 0.5, max: 3, step: 0.01, fmt: 'decimal' },
        ],
      },
      {
        section: 'FY2027 Revenue Model',
        items: [
          { key: 'revQ1', label: 'Q1 Apr 2026 ($B)', min: 40, max: 130, step: 0.5, fmt: 'billion' },
          { key: 'revQ2', label: 'Q2 Jul 2026 ($B)', min: 50, max: 160, step: 0.5, fmt: 'billion' },
          { key: 'revQ3', label: 'Q3 Oct 2026 ($B)', min: 60, max: 190, step: 0.5, fmt: 'billion' },
          { key: 'revQ4', label: 'Q4 Jan 2027 ($B)', min: 80, max: 230, step: 0.5, fmt: 'billion' },
        ],
      },
    ],
  },
  scenarios: {
    bear: {
      label: 'Bear',
      description: 'Deceleration begins in FY2028. Multiple compresses to '
                 + 'the low end of the historical range.',
      seedValues: [8.98],
      growthStages: [
        { years: 1, rate: 0.25 },
        { years: 3, rate: 0.12 },
        { years: 5, rate: 0.05 }
      ],
      terminal: { growth: 0.04, years: 10 },
      multipleBand: { min: 25.0, max: 33.0 }
    },

    base: {
      label: 'Base',
      description: 'Consensus through FY2028, then decelerating toward a '
                 + 'mature growth rate. Multiple band floor is the '
                 + 'spreadsheet Qtr-12 P/E trend estimate of 29.4x.',
      seedValues: [8.98, 12.79],
      growthStages: [
        { years: 3, rate: 0.20 },
        { years: 5, rate: 0.12 }
      ],
      terminal: { growth: 0.08, years: 10 },
      multipleBand: { min: 29.0, max: 40.0 }
    },

    bull: {
      label: 'Bull',
      description: 'Source spreadsheet analysis. Reproduces the '
                 + 'authoritative model exactly.',
      seedValues: [8.98, 12.79],
      growthStages: [
        { years: 3, rate: 0.30 },
        { years: 5, rate: 0.20 }
      ],
      terminal: { growth: 0.15, years: 10 },
      multipleBand: { min: 37.28, max: 47.85 }
    }
  },

  defaultScenario: 'base'
}

// ─── BX ─────────────────────────────────────────────────────────────────────
export const BX_CONFIG = {
  ticker: 'BX',
  metric: 'DE',  // P/DE multiple targets still use DE
  valuationMetric: 'DpS',  // DCF now uses Distributions per Share
  baseValue: 5.23,  // starting point (first seed overrides in staged DCF)
  baseValueLabel: 'CY2026 Distributions per Share (DpS)',
  forward: { y1: 6.03, y2: 7.56 },  // corrected DE estimates for P/DE targets
  forwardDE: { y1: 6.03, y2: 7.56 },  // explicit DE for multiple calcs (DE ≠ DpS)
  multipleBand: { min: 22, max: 29 },  // applied to DE, not DpS
  projectionGrowth: 10,
  capm: { rf: 0.0456, erp: 0.055, beta: 1.13 },  // d = 10.78%
  seedValues: [5.23, 6.29],  // CY2026, CY2027 consensus DpS
  growthStages: [
    { years: 8, rate: 0.10 },   // years 3-10 at flat 10%
  ],
  terminal: { growth: 0.12, years: 20 },
  payoutRatio: 85,
  revenueModel: null,  // BX doesn't have a quarterly revenue model in the UI
  priceFallback: 114.52,
  historicalMultiple: [
    { label: 'Current', value: 27.36 },
    { label: 'Q4 2025', value: 27.36 },
    { label: 'Q3 2025', value: 27.64 },
    { label: 'Q2 2025', value: 30.96 },
    { label: 'Q1 2025', value: 29.84 },
    { label: 'Q4 2024', value: 29.34 },
    { label: 'Q3 2024', value: 37.10 },
    { label: 'Q2 2024', value: 37.73 },
    { label: 'Q1 2024', value: 31.04 },
    { label: 'Q4 2023', value: 33.23 },
    { label: 'Q3 2023', value: 33.22 },
    { label: 'Q2 2023', value: 27.43 },
    { label: 'Q1 2023', value: 23.11 },
    { label: 'Q4 2022', value: 19.14 },
    { label: 'Q3 2022', value: 14.33 },
    { label: 'Q2 2022', value: 14.40 },
    { label: 'Q1 2022', value: 15.12 },
    { label: 'Q4 2021', value: 23.66 },
    { label: 'Q3 2021', value: 27.09 },
    { label: 'Q2 2021', value: 27.70 },
    { label: 'Q1 2021', value: 27.34 },
    { label: 'Q4 2020', value: 23.55 },
    { label: 'Q3 2020', value: 24.38 },
    { label: 'Q2 2020', value: 23.23 },
    { label: 'Q1 2020', value: 25.89 },
    { label: 'Q4 2019', value: 19.66 },
    { label: 'Q3 2019', value: 24.38 },
    { label: 'Q2 2019', value: 21.62 },
    { label: 'Q1 2019', value: 18.24 },
    { label: 'Q4 2018', value: 13.69 },
    { label: 'Q3 2018', value: 11.79 },
    { label: 'Q2 2018', value: 13.38 },
    { label: 'Q1 2018', value: 12.32 },
    { label: 'Q4 2017', value: 12.46 },
    { label: 'Q3 2017', value: 10.08 },
    { label: 'Q2 2017', value: 12.23 },
    { label: 'Q1 2017', value: 12.38 },
    { label: 'Q4 2016', value: 11.96 },
    { label: 'Q3 2016', value: 15.12 },
    { label: 'Q2 2016', value: 13.07 },
    { label: 'Q1 2016', value: 11.99 },
    { label: 'Q4 2015', value: 11.25 },
    { label: 'Q3 2015', value: 9.10 },
    { label: 'Q2 2015', value: 9.28 },
    { label: 'Q1 2015', value: 12.19 },
    { label: 'Q4 2014', value: 12.43 },
  ],
  sliderConfig: {
    sections: [
      {
        section: 'P/DE Valuation (uses DE)',
        items: [
          { key: 'y1', label: '1-year forward DE', min: 3, max: 12, step: 0.01, fmt: 'dlr' },
          { key: 'y2', label: '2-year forward DE', min: 3, max: 15, step: 0.01, fmt: 'dlr' },
          { key: 'minMultiple', label: 'Min P/DE multiple', min: 10, max: 40, step: 0.1, fmt: 'multiple' },
          { key: 'maxMultiple', label: 'Max P/DE multiple', min: 10, max: 50, step: 0.1, fmt: 'multiple' },
        ],
      },
      {
        section: 'Staged DCF (uses DpS)',
        items: [
          { key: 'capmRf', label: 'Risk-free rate (rf)', min: 1, max: 8, step: 0.01, fmt: 'percent' },
          { key: 'capmErp', label: 'Equity risk premium', min: 2, max: 10, step: 0.1, fmt: 'percent' },
          { key: 'capmBeta', label: 'Beta', min: 0.5, max: 2, step: 0.01, fmt: 'decimal' },
        ],
      },
    ],
  },
}

// ─── GOOGL ──────────────────────────────────────────────────────────────────
export const GOOGL_CONFIG = {
  ticker: 'GOOGL',
  metric: 'EPS',
  valuationMetric: 'EPS',
  baseValue: 10.81,
  baseValueLabel: '2025 actual EPS',
  forward: { y1: 14.24, y2: 14.49 },
  multipleBand: { min: 18.0, max: 26.0 },
  projectionGrowth: 15,
  capm: null,  // TODO: no source analysis exists; derive beta before switching to CAPM
  discountRateOverride: 0.10,  // 10% — no CAPM source yet
  seedValues: null,  // no consensus seeds; start from baseValue
  growthStages: [
    { years: 5, rate: 0.20 },   // years 1-5
    { years: 5, rate: 0.12 },   // years 6-10
  ],
  terminal: { growth: 0.12, years: 10 },
  revenueModel: { q1: 90, q2: 97, q3: 103, q4: 110 },
  priceFallback: 160.00,
  historicalMultiple: [
    { label: 'Current', value: 20.12 },
    { label: 'Jan 2025', value: 22.48 },
    { label: 'Oct 2024', value: 23.55 },
    { label: 'Jul 2024', value: 22.03 },
    { label: 'Apr 2024', value: 25.10 },
    { label: 'Jan 2024', value: 26.82 },
    { label: 'Oct 2023', value: 27.05 },
  ],
  sliderConfig: {
    sections: [
      {
        section: 'P/E Valuation',
        items: [
          { key: 'y1', label: '1-year forward EPS', min: 5, max: 20, step: 0.01, fmt: 'dlr' },
          { key: 'y2', label: '2-year forward EPS', min: 5, max: 25, step: 0.01, fmt: 'dlr' },
          { key: 'minMultiple', label: 'Min P/E multiple', min: 10, max: 50, step: 0.1, fmt: 'multiple' },
          { key: 'maxMultiple', label: 'Max P/E multiple', min: 10, max: 60, step: 0.1, fmt: 'multiple' },
          { key: 'projGrowth', label: 'Projection growth g', min: 5, max: 40, step: 0.1, fmt: 'percent' },
        ],
      },
      {
        section: 'Staged DCF (Advanced)',
        items: [
          { key: 'discountRate', label: 'Discount rate d', min: 5, max: 15, step: 0.1, fmt: 'percent' },
        ],
      },
      {
        section: 'FY2026 Revenue Model',
        items: [
          { key: 'revQ1', label: 'Q1 Jan–Mar 2026 ($B)', min: 60, max: 150, step: 0.5, fmt: 'billion' },
          { key: 'revQ2', label: 'Q2 Apr–Jun 2026 ($B)', min: 60, max: 160, step: 0.5, fmt: 'billion' },
          { key: 'revQ3', label: 'Q3 Jul–Sep 2026 ($B)', min: 60, max: 170, step: 0.5, fmt: 'billion' },
          { key: 'revQ4', label: 'Q4 Oct–Dec 2026 ($B)', min: 60, max: 180, step: 0.5, fmt: 'billion' },
        ],
      },
    ],
  },
}

export const TICKER_CONFIG = {
  NVDA: NVDA_CONFIG,
  BX: BX_CONFIG,
  GOOGL: GOOGL_CONFIG,
}

/**
 * Helper: deep-clone config for reactive mutation.
 * Used on mount to create a reactive store that survives slider changes.
 */
export function cloneConfigForReactive(config) {
  return JSON.parse(JSON.stringify(config))
}

/**
 * Helper: reset a reactive store back to config defaults.
 * Call this from scenario preset buttons.
 */
export function resetConfigToDefaults(reactiveStore, originalConfig) {
  const fresh = cloneConfigForReactive(originalConfig)
  Object.assign(reactiveStore, fresh)
}

/**
 * Helper: apply a scenario preset to a reactive store.
 * Scenario defines seedValues, growthStages, terminal, and multipleBand.
 * The forward/y1/y2 are computed from seedValues or not applied (left as-is).
 */
export function applyScenario(reactiveStore, scenarioKey, tickerConfig) {
  if (!tickerConfig.scenarios || !tickerConfig.scenarios[scenarioKey]) {
    console.warn(`Scenario '${scenarioKey}' not found in ${tickerConfig.ticker} config`)
    return
  }

  const scenario = tickerConfig.scenarios[scenarioKey]

  // Apply scenario fields to the store
  if (scenario.seedValues !== undefined) {
    reactiveStore.seedValues = JSON.parse(JSON.stringify(scenario.seedValues))
  }
  if (scenario.growthStages !== undefined) {
    reactiveStore.growthStages = JSON.parse(JSON.stringify(scenario.growthStages))
  }
  if (scenario.terminal !== undefined) {
    reactiveStore.terminal = JSON.parse(JSON.stringify(scenario.terminal))
  }
  if (scenario.multipleBand !== undefined) {
    reactiveStore.multipleBand = JSON.parse(JSON.stringify(scenario.multipleBand))
  }
}
