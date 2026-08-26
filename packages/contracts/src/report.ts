import { z } from 'zod'

/**
 * `report.json` — the ONLY interface between the analyzer and the viewer
 * (Constitution rule 4). Objects are strict: an unexpected field is a schema
 * violation, not something to pass through silently, so drift between `core`'s
 * types and this contract fails loudly at the seam.
 *
 * The document carries no timestamp and no absolute paths, so two runs over the
 * same inputs produce byte-identical output and can be snapshot-tested.
 */

export const FINDING_KINDS = ['dead-key', 'value-duplicate', 'locale-gap', 'convention'] as const
export const FindingKindSchema = z.enum(FINDING_KINDS)

export const FindingSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('dead-key'),
    key: z.string(),
    locales: z.array(z.string()),
  }),
  z.strictObject({
    kind: z.literal('value-duplicate'),
    value: z.string(),
    keys: z.array(z.string()),
    locale: z.string(),
  }),
  z.strictObject({
    kind: z.literal('locale-gap'),
    key: z.string(),
    presentIn: z.array(z.string()),
    missingIn: z.array(z.string()),
  }),
  z.strictObject({
    kind: z.literal('convention'),
    file: z.string(),
    namespaces: z.array(z.string()),
  }),
])

export const FileScanSchema = z.strictObject({
  file: z.string(),
  namespaces: z.array(z.string()),
  keys: z.array(z.string()),
  dynamicPatterns: z.array(z.string()),
  unattributed: z.boolean(),
})

const count = z.number().int().nonnegative()
const percent = z.number().min(0).max(100)

/**
 * The four-way key partition. `verified + fogAlive + wideningAlive + dead`
 * equals `total`, which is what makes the percentages auditable from the
 * counts rather than taken on trust.
 */
export const KeyCoverageSchema = z.strictObject({
  total: count,
  verified: count,
  fogAlive: count,
  wideningAlive: count,
  dead: count,
  /** fogAlive / total. */
  fogPct: percent,
  /** wideningAlive / total. */
  unattributedPct: percent,
})

/**
 * Per-namespace declared-key counts. The viewer sizes its treemap tiles by this
 * and can derive nothing equivalent from `findings` or `fileScans`: a namespace
 * with no findings would otherwise be invisible, and `fileScans.keys` records
 * keys *used*, not keys declared. Added in Stage 5, which is the first consumer.
 */
export const NamespaceSummarySchema = z.strictObject({
  name: z.string(),
  /** Distinct KeyIds declared under this namespace, across all locales. */
  keys: count,
})

/** EXPECTED.md §H's file-level rows, kept as secondary diagnostics. */
export const FileCoverageSchema = z.strictObject({
  total: count,
  withBindings: count,
  unattributed: count,
  withDynamicPatterns: count,
})

export const SummarySchema = z.strictObject({
  totals: z.strictObject({
    namespaces: count,
    locales: count,
    keys: count,
    files: count,
    findings: count,
    findingsByKind: z.strictObject({
      'dead-key': count,
      'value-duplicate': count,
      'locale-gap': count,
      convention: count,
    }),
  }),
  keys: KeyCoverageSchema,
  files: FileCoverageSchema,
  namespaces: z.array(NamespaceSummarySchema),
  /** Constitution rule 3: t() calls found, zero hook bindings repo-wide. */
  silenceWarning: z.boolean(),
})

export const ScanConfigSchema = z.strictObject({
  srcDir: z.string(),
  localesDir: z.string(),
  hooks: z.array(z.string()),
  localesPattern: z.string(),
  maxNamespacesPerFile: count,
  failOn: z.array(FindingKindSchema),
})

export const ReportSchema = z.strictObject({
  config: ScanConfigSchema,
  summary: SummarySchema,
  findings: z.array(FindingSchema),
  fileScans: z.array(FileScanSchema),
})

export type FindingKind = z.infer<typeof FindingKindSchema>
export type Finding = z.infer<typeof FindingSchema>
export type FileScan = z.infer<typeof FileScanSchema>
export type KeyCoverage = z.infer<typeof KeyCoverageSchema>
export type FileCoverage = z.infer<typeof FileCoverageSchema>
export type NamespaceSummary = z.infer<typeof NamespaceSummarySchema>
export type Summary = z.infer<typeof SummarySchema>
export type ScanConfig = z.infer<typeof ScanConfigSchema>
export type Report = z.infer<typeof ReportSchema>
