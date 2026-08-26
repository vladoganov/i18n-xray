/**
 * Stage 3 integration test: loader + scanner + core against `fixtures/basic-app`.
 *
 * Everything expected here is transcribed from `fixtures/basic-app/EXPECTED.md`
 * — §C1/§C2 for the scans, §D/§E for the findings. Stage 2 fed those same scans
 * to `core` by hand; this test proves the scanner actually produces them, which
 * is the join that makes the hand-built unit tests mean something.
 *
 * It lives in `cli` because that is the only package already depending on
 * loader, scanner and core. Putting it in an adapter would need a sideways
 * adapter-to-adapter dependency.
 */
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  checkConventions,
  findDeadKeys,
  findLocaleGaps,
  findValueDuplicates,
} from '@i18n-xray/core'
import type { FileScan, Finding } from '@i18n-xray/core'
import { loadLocales } from '@i18n-xray/loader'
import { scanDirectory } from '@i18n-xray/scanner'

const FIXTURE = fileURLToPath(new URL('../../../fixtures/basic-app', import.meta.url))
const MAX_NAMESPACES_PER_FILE = 1

const catalog = await loadLocales('locales', { cwd: FIXTURE })
const defaultRunScans = await scanDirectory('src', { cwd: FIXTURE })
const wrapperRunScans = await scanDirectory('src', {
  cwd: FIXTURE,
  hooks: ['useTranslation', 'useAppTranslation'],
})

const findingsFor = (scans: FileScan[]): Finding[] => [
  ...findDeadKeys(catalog, scans),
  ...findValueDuplicates(catalog),
  ...findLocaleGaps(catalog),
  ...checkConventions(scans, MAX_NAMESPACES_PER_FILE),
]

const byFile = (scans: FileScan[]): FileScan[] =>
  [...scans].sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0))

/** §C1 — default run, `--hook useTranslation`. */
const EXPECTED_SCANS_DEFAULT_RUN: FileScan[] = [
  {
    file: 'src/App.tsx',
    namespaces: ['common'],
    keys: ['beta.badge', 'actions.cancel', 'cta.save'],
    dynamicPatterns: [],
    unattributed: false,
  },
  {
    file: 'src/CheckoutSummary.tsx',
    namespaces: ['common', 'checkout'],
    keys: ['title', 'totals.grandTotal'],
    dynamicPatterns: [],
    unattributed: false,
  },
  {
    file: 'src/CheckoutForm.tsx',
    namespaces: ['checkout'],
    keys: ['buttons.cancel'],
    dynamicPatterns: [],
    unattributed: false,
  },
  {
    file: 'src/ErrorBanner.tsx',
    namespaces: ['checkout'],
    keys: [],
    dynamicPatterns: ['errors.*'],
    unattributed: false,
  },
  {
    file: 'src/PriceLabel.tsx',
    namespaces: [],
    keys: ['price.label'],
    dynamicPatterns: [],
    unattributed: true,
  },
  {
    file: 'src/AdminPanel.tsx',
    namespaces: [],
    keys: ['panel.heading'],
    dynamicPatterns: [],
    unattributed: true,
  },
  {
    file: 'src/useAppTranslation.ts',
    namespaces: [],
    keys: [],
    dynamicPatterns: [],
    unattributed: false,
  },
]

/** §C2 — wrapper run. One row differs. */
const EXPECTED_SCANS_WRAPPER_RUN: FileScan[] = EXPECTED_SCANS_DEFAULT_RUN.map((scan) =>
  scan.file === 'src/AdminPanel.tsx'
    ? {
        file: 'src/AdminPanel.tsx',
        namespaces: ['admin'],
        keys: ['panel.heading'],
        dynamicPatterns: [],
        unattributed: false,
      }
    : scan,
)

/** §D — the complete default-run list. */
const EXPECTED_FINDINGS_DEFAULT_RUN: Finding[] = [
  { kind: 'dead-key', key: 'common:legacy.tooltip', locales: ['en', 'pl'] },
  {
    kind: 'value-duplicate',
    value: 'Cancel',
    keys: ['checkout:buttons.cancel', 'common:actions.cancel'],
    locale: 'en',
  },
  { kind: 'locale-gap', key: 'common:beta.badge', presentIn: ['en'], missingIn: ['pl'] },
  { kind: 'convention', file: 'src/CheckoutSummary.tsx', namespaces: ['common', 'checkout'] },
]

/** §E — the same four, plus row 9. */
const EXPECTED_FINDINGS_WRAPPER_RUN: Finding[] = [
  ...EXPECTED_FINDINGS_DEFAULT_RUN,
  { kind: 'dead-key', key: 'common:panel.heading', locales: ['en', 'pl'] },
]

describe('loader — the fixture catalog matches §B2', () => {
  it('flattens both locales to the KeyIds §H counts', () => {
    expect(Object.keys(catalog).sort()).toEqual(['en', 'pl'])
    expect(Object.keys(catalog['en'] ?? {})).toHaveLength(14)
    expect(Object.keys(catalog['pl'] ?? {})).toHaveLength(13)
  })

  it('namespace-prefixes nested keys and reads their values', () => {
    expect(catalog['en']?.['common:legacy.tooltip']).toBe('Click to expand the legacy panel')
    expect(catalog['en']?.['checkout:totals.grandTotal']).toBe('Grand total')
    expect(catalog['pl']?.['common:beta.badge']).toBeUndefined()
  })
})

describe('scanner — FileScans match §C exactly', () => {
  it('§C1 — default run, --hook useTranslation', () => {
    expect(byFile(defaultRunScans)).toEqual(byFile(EXPECTED_SCANS_DEFAULT_RUN))
  })

  it('§C2 — wrapper run, --hook useTranslation useAppTranslation', () => {
    expect(byFile(wrapperRunScans)).toEqual(byFile(EXPECTED_SCANS_WRAPPER_RUN))
  })
})

describe('findings — the complete list matches EXPECTED.md, no extra, no missing', () => {
  it('§D — exactly four findings on the default run', () => {
    const actual = findingsFor(defaultRunScans)
    for (const expected of EXPECTED_FINDINGS_DEFAULT_RUN) expect(actual).toContainEqual(expected)
    expect(actual).toHaveLength(EXPECTED_FINDINGS_DEFAULT_RUN.length)
  })

  it('§E — exactly five findings on the wrapper run', () => {
    const actual = findingsFor(wrapperRunScans)
    for (const expected of EXPECTED_FINDINGS_WRAPPER_RUN) expect(actual).toContainEqual(expected)
    expect(actual).toHaveLength(EXPECTED_FINDINGS_WRAPPER_RUN.length)
  })
})

describe('§G — silence-warning inputs', () => {
  it.each([
    ['--hook useTranslation (default)', ['useTranslation'], 4],
    ['--hook useTranslation useAppTranslation', ['useTranslation', 'useAppTranslation'], 5],
    ['--hook useAppTranslation (alone)', ['useAppTranslation'], 1],
    ['--hook useNothing', ['useNothing'], 0],
  ])('%s binds %o files', async (_label, hooks, expectedBindingFiles) => {
    const scans = await scanDirectory('src', { cwd: FIXTURE, hooks })
    expect(scans.filter((scan) => scan.namespaces.length > 0)).toHaveLength(expectedBindingFiles)
    // §G's other column: six of the seven files make a t() call, in every run.
    expect(
      scans.filter((scan) => scan.keys.length > 0 || scan.dynamicPatterns.length > 0),
    ).toHaveLength(6)
  })
})
