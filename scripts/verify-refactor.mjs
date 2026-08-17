#!/usr/bin/env node
/**
 * Headless verification: compare A.5 refactored metrics against pre-A.5 baseline.
 *
 * This script:
 * 1. Computes post-A.5 metrics from current config and functions
 * 2. Simulates pre-A.5 metrics from old hardcoded literals
 * 3. Writes before/after JSON and a comparison table
 *
 * Expected: all metrics match (no-behavior-change refactor)
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = dirname(__dirname)

// ─── Import config and valuation functions ──────────────────────
const configPath = join(rootDir, 'config/tickerConfig.js')
const configContent = readFileSync(configPath, 'utf8')

// Extract NVDA, BX, GOOGL configs using regex (avoid full eval)
function extractConfig(content, ticker) {
  const pattern = new RegExp(`export const ${ticker}_CONFIG = (\\{[\\s\\S]*?\\n\\})`, 'm')
  const match = content.match(pattern)
  if (!match) throw new Error(`Could not extract ${ticker}_CONFIG`)

  // Safely eval the object literal
  const configStr = `(${match[1]})`
  return eval(configStr)
}

const NVDA_CONFIG = extractConfig(configContent, 'NVDA')
const BX_CONFIG = extractConfig(configContent, 'BX')
const GOOGL_CONFIG = extractConfig(configContent, 'GOOGL')

console.log('✓ Config loaded')

// ─── Import valuation composable ─────────────────────────────────
const composablePath = join(rootDir, 'composables/useStockValuation.js')
const composableContent = readFileSync(composablePath, 'utf8')

// Extract computeTwoPhaseDCF and computeSinglePhaseDCF functions
const dcfMatch = composableContent.match(/export function computeTwoPhaseDCF\(([\s\S]*?)\n\}/)
if (!dcfMatch) throw new Error('Could not extract computeTwoPhaseDCF')

const singleMatch = composableContent.match(/export function computeSinglePhaseDCF\(([\s\S]*?)\n\}/)
if (!singleMatch) throw new Error('Could not extract computeSinglePhaseDCF')

// Build functions from the source code
const computeTwoPhaseDCF = eval(`(${dcfMatch[0].replace('export function', 'function')})`)
const computeSinglePhaseDCF = eval(`(${singleMatch[0].replace('export function', 'function')})`)
console.log('✓ computeTwoPhaseDCF loaded')
console.log('✓ computeSinglePhaseDCF loaded')

// ─── POST-A.5: Compute metrics from current config ────────────────

function computePostA5(config, ticker) {
  const { baseValue, forward, multipleBand, dcfDefaults, terminalMultiplier, discountRateOverride, priceFallback } = config

  // Target ranges (1-year and 2-year)
  const target1yrLow = forward.y1 * multipleBand.min
  const target1yrHigh = forward.y1 * multipleBand.max
  const target2yrLow = forward.y2 * multipleBand.min
  const target2yrHigh = forward.y2 * multipleBand.max

  // DCF floor (using config values, no state overrides)
  // BX uses single-phase, others use two-phase
  let dcfFloor
  if (ticker === 'BX') {
    dcfFloor = computeSinglePhaseDCF({
      baseMetric: baseValue,
      g: dcfDefaults.g / 100,
      d: discountRateOverride / 100,
      terminalMultiplier: terminalMultiplier || 20,
    })
  } else {
    dcfFloor = computeTwoPhaseDCF({
      baseEPS: baseValue,
      g5: dcfDefaults.g5 / 100,
      h5: dcfDefaults.h5 / 100,
      d: discountRateOverride / 100,
      terminalMultiplier: terminalMultiplier || 10,
    })
  }

  return {
    ticker,
    bandMin: multipleBand.min,
    bandMax: multipleBand.max,
    forwardY1: forward.y1,
    forwardY2: forward.y2,
    target1yrLow: parseFloat(target1yrLow.toFixed(2)),
    target1yrHigh: parseFloat(target1yrHigh.toFixed(2)),
    target2yrLow: parseFloat(target2yrLow.toFixed(2)),
    target2yrHigh: parseFloat(target2yrHigh.toFixed(2)),
    dcfFloor: parseFloat(dcfFloor.toFixed(2)),
    baseValue,
    terminalMultiplier: terminalMultiplier || (ticker === 'BX' ? 20 : 10),
    discountRate: discountRateOverride,
    priceFallback,
  }
}

const postA5 = {
  NVDA: computePostA5(NVDA_CONFIG, 'NVDA'),
  BX: computePostA5(BX_CONFIG, 'BX'),
  GOOGL: computePostA5(GOOGL_CONFIG, 'GOOGL'),
}

console.log('✓ Post-A.5 metrics computed')

// ─── PRE-A.5: Hardcoded literals from old component ────────────────

// These are the hardcoded defaults that existed before A.5
const preA5 = {
  NVDA: {
    ticker: 'NVDA',
    bandMin: 39.5,
    bandMax: 58.9,
    forwardY1: 8.94,
    forwardY2: 12.65,
    target1yrLow: parseFloat((8.94 * 39.5).toFixed(2)),
    target1yrHigh: parseFloat((8.94 * 58.9).toFixed(2)),
    target2yrLow: parseFloat((12.65 * 39.5).toFixed(2)),
    target2yrHigh: parseFloat((12.65 * 58.9).toFixed(2)),
    dcfFloor: computeTwoPhaseDCF({
      baseEPS: 4.90,
      g5: 0.70,
      h5: 0.30,
      d: 0.12,
      terminalMultiplier: 10,
    }).toFixed(2),
    baseValue: 4.90,
    terminalMultiplier: 10,
    discountRate: 12,
    priceFallback: 176.63,
  },
  BX: {
    ticker: 'BX',
    bandMin: 22,
    bandMax: 29,
    forwardY1: 6.33,
    forwardY2: 7.90,
    target1yrLow: parseFloat((6.33 * 22).toFixed(2)),
    target1yrHigh: parseFloat((6.33 * 29).toFixed(2)),
    target2yrLow: parseFloat((7.90 * 22).toFixed(2)),
    target2yrHigh: parseFloat((7.90 * 29).toFixed(2)),
    dcfFloor: computeSinglePhaseDCF({
      baseMetric: 5.84,
      g: 0.10,
      d: 0.08,
      terminalMultiplier: 20,
    }).toFixed(2),
    baseValue: 5.84,
    terminalMultiplier: 20,
    discountRate: 8,
    priceFallback: 114.52,
  },
  GOOGL: {
    ticker: 'GOOGL',
    bandMin: 18.0,
    bandMax: 26.0,
    forwardY1: 14.24,
    forwardY2: 14.49,
    target1yrLow: parseFloat((14.24 * 18.0).toFixed(2)),
    target1yrHigh: parseFloat((14.24 * 26.0).toFixed(2)),
    target2yrLow: parseFloat((14.49 * 18.0).toFixed(2)),
    target2yrHigh: parseFloat((14.49 * 26.0).toFixed(2)),
    dcfFloor: computeTwoPhaseDCF({
      baseEPS: 10.81,
      g5: 0.20,
      h5: 0.12,
      d: 0.10,
      terminalMultiplier: 10,
    }).toFixed(2),
    baseValue: 10.81,
    terminalMultiplier: 10,
    discountRate: 10,
    priceFallback: 160.00,
  },
}

console.log('✓ Pre-A.5 metrics computed (from hardcoded literals)')

// ─── Build comparison table ──────────────────────────────────────

const metrics = [
  'bandMin',
  'bandMax',
  'forwardY1',
  'forwardY2',
  'target1yrLow',
  'target1yrHigh',
  'target2yrLow',
  'target2yrHigh',
  'dcfFloor',
  'baseValue',
  'terminalMultiplier',
  'discountRate',
  'priceFallback',
]

const tickers = ['NVDA', 'BX', 'GOOGL']

function pad(str, width) {
  return String(str).padEnd(width)
}

function compareMetrics(ticker) {
  console.log(`\n════════════════════════════════════════════════════════════`)
  console.log(`  ${ticker}`)
  console.log(`════════════════════════════════════════════════════════════`)
  console.log(
    pad('Metric', 20) + ' | ' + pad('Before', 15) + ' | ' + pad('After', 15) + ' | Match'
  )
  console.log(`${'-'.repeat(20)}-+-${'-'.repeat(15)}-+-${'-'.repeat(15)}-+-${'-'.repeat(5)}`)

  let allMatch = true
  for (const metric of metrics) {
    const before = preA5[ticker][metric]
    const after = postA5[ticker][metric]

    const beforeStr = typeof before === 'string' ? before : String(before)
    const afterStr = typeof after === 'string' ? after : String(after)

    const match = beforeStr === afterStr ? '✓' : '✗'
    if (match === '✗') allMatch = false

    console.log(
      pad(metric, 20) + ' | ' + pad(beforeStr, 15) + ' | ' + pad(afterStr, 15) + ' | ' + match
    )
  }

  console.log(`${'-'.repeat(20)}-+-${'-'.repeat(15)}-+-${'-'.repeat(15)}-+-${'-'.repeat(5)}`)
  console.log(`Result: ${allMatch ? '✓ ALL MATCH' : '✗ MISMATCHES FOUND'}`)

  return allMatch
}

// ─── Write JSON outputs ──────────────────────────────────────────

const verifyDir = join(rootDir, 'verification')
mkdirSync(verifyDir, { recursive: true })

writeFileSync(
  join(verifyDir, 'before.json'),
  JSON.stringify(preA5, null, 2)
)
writeFileSync(
  join(verifyDir, 'after.json'),
  JSON.stringify(postA5, null, 2)
)

console.log(`\n✓ Wrote verification/before.json`)
console.log(`✓ Wrote verification/after.json`)

// ─── Print comparison tables ────────────────────────────────────

const results = {}
for (const ticker of tickers) {
  results[ticker] = compareMetrics(ticker)
}

// ─── Summary ──────────────────────────────────────────────────────

console.log(`\n════════════════════════════════════════════════════════════`)
console.log(`  SUMMARY`)
console.log(`════════════════════════════════════════════════════════════`)

const allPass = Object.values(results).every(r => r === true)
if (allPass) {
  console.log('✓ A.5 VERIFICATION PASSED: All metrics match pre-refactor baseline')
  console.log(`✓ No behavior changes detected`)
  console.log(`✓ Ready for Part B: DCF replacement`)
} else {
  console.log('✗ A.5 VERIFICATION FAILED: Mismatches found')
  console.log(`✗ Check verification/before.json vs verification/after.json`)
  process.exit(1)
}
