/**
 * The fixture's `report.json`, hand-transcribed from
 * `packages/cli/src/__snapshots__/report.default-run.json`.
 *
 * Transcribed rather than read: the viewer is a pure `Report -> string`
 * function with no filesystem access — its tsconfig exposes no Node types at
 * all, which is what keeps it from quietly acquiring I/O. The CLI's
 * report-command test renders the real file on disk and asserts the two agree.
 */
import type { Report } from '@i18n-xray/contracts'

export const FIXTURE_REPORT: Report = {
  config: {
    srcDir: 'src',
    localesDir: 'locales',
    hooks: ['useTranslation'],
    localesPattern: '{locale}/{ns}.json',
    maxNamespacesPerFile: 1,
    failOn: [],
  },
  summary: {
    totals: {
      namespaces: 3,
      locales: 2,
      keys: 14,
      files: 7,
      findings: 4,
      findingsByKind: {
        'dead-key': 1,
        'value-duplicate': 1,
        'locale-gap': 1,
        convention: 1,
      },
    },
    keys: {
      total: 14,
      verified: 7,
      fogAlive: 2,
      wideningAlive: 4,
      dead: 1,
      fogPct: 14.3,
      unattributedPct: 28.6,
    },
    files: { total: 7, withBindings: 4, unattributed: 2, withDynamicPatterns: 1 },
    namespaces: [
      { name: 'admin', keys: 2 },
      { name: 'checkout', keys: 6 },
      { name: 'common', keys: 6 },
    ],
    silenceWarning: false,
  },
  findings: [
    { kind: 'dead-key', key: 'common:legacy.tooltip', locales: ['en', 'pl'] },
    {
      kind: 'value-duplicate',
      value: 'Cancel',
      keys: ['checkout:buttons.cancel', 'common:actions.cancel'],
      locale: 'en',
    },
    { kind: 'locale-gap', key: 'common:beta.badge', presentIn: ['en'], missingIn: ['pl'] },
    { kind: 'convention', file: 'src/CheckoutSummary.tsx', namespaces: ['common', 'checkout'] },
  ],
  fileScans: [],
}

/** Structural clone without `structuredClone`, which the viewer's lib lacks. */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
