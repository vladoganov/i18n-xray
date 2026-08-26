import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  checkConventions,
  findDeadKeys,
  findLocaleGaps,
  findValueDuplicates,
} from '@i18n-xray/core'
import type { FileScan, Finding } from '@i18n-xray/core'
import { ReportSchema } from '@i18n-xray/contracts'
import type { FindingKind, Report } from '@i18n-xray/contracts'
import { DEFAULT_LOCALES_PATTERN, loadLocales } from '@i18n-xray/loader'
import { DEFAULT_HOOKS, scanDirectory } from '@i18n-xray/scanner'
import { buildReport } from './build-report'

export { DEFAULT_HOOKS, DEFAULT_LOCALES_PATTERN }
export const DEFAULT_MAX_NAMESPACES_PER_FILE = 1

/** Raised for anything the user can fix by changing flags or paths: exit 2. */
export class ConfigError extends Error {}

export type ScanRequest = {
  srcDir: string
  localesDir: string
  hooks: string[]
  localesPattern: string
  maxNamespacesPerFile: number
  failOn: FindingKind[]
  cwd?: string
}

export type ScanOutcome = {
  report: Report
  /** 0 clean · 1 a --fail-on kind is present, or silence fired under --fail-on. */
  exitCode: 0 | 1
  /** Why the exit code is 1, in the order the user should read them. */
  reasons: string[]
}

export async function runScan(request: ScanRequest): Promise<ScanOutcome> {
  await assertDirectory(request.srcDir, request.cwd, 'srcDir')
  await assertDirectory(request.localesDir, request.cwd, 'localesDir')

  const catalog = await loadLocales(request.localesDir, {
    pattern: request.localesPattern,
    ...(request.cwd === undefined ? {} : { cwd: request.cwd }),
  })
  const scans = await scanDirectory(request.srcDir, {
    hooks: request.hooks,
    ...(request.cwd === undefined ? {} : { cwd: request.cwd }),
  })

  const findings: Finding[] = [
    ...findDeadKeys(catalog, scans),
    ...findValueDuplicates(catalog),
    ...findLocaleGaps(catalog),
    ...checkConventions(scans, request.maxNamespacesPerFile),
  ]

  const silenceWarning = detectSilence(scans)
  const report = ReportSchema.parse(
    buildReport({
      config: {
        srcDir: request.srcDir,
        localesDir: request.localesDir,
        hooks: request.hooks,
        localesPattern: request.localesPattern,
        maxNamespacesPerFile: request.maxNamespacesPerFile,
        failOn: request.failOn,
      },
      catalog,
      scans,
      findings,
      silenceWarning,
    }),
  )

  const reasons: string[] = []
  if (request.failOn.length > 0) {
    // Silence is fatal under ANY --fail-on, not only when a kind is listed.
    // Constitution rule 3: never report a clean bill of health from an empty
    // scan — and a misconfigured hook makes every kind come back empty, so
    // gating silence on a specific kind would defeat the check exactly when it
    // matters most.
    if (silenceWarning) {
      reasons.push('suspicious silence: t() calls found but no hook bindings repo-wide')
    }
    for (const kind of request.failOn) {
      const count = report.summary.totals.findingsByKind[kind]
      if (count > 0) reasons.push(`--fail-on ${kind}: ${count} found`)
    }
  }

  return { report, exitCode: reasons.length > 0 ? 1 : 0, reasons }
}

/**
 * Constitution rule 3. A zero-bindings check, never a threshold: one binding
 * file anywhere in the repo is enough to stay quiet, however many files were
 * missed (EXPECTED.md §G, row 3).
 */
export function detectSilence(scans: FileScan[]): boolean {
  const bindingFiles = scans.filter((scan) => scan.namespaces.length > 0).length
  const callingFiles = scans.filter(
    (scan) => scan.keys.length > 0 || scan.dynamicPatterns.length > 0 || scan.unattributed,
  ).length
  return callingFiles > 0 && bindingFiles === 0
}

export async function writeReport(report: Report, jsonPath: string, cwd?: string): Promise<void> {
  const target = cwd === undefined ? jsonPath : path.join(cwd, jsonPath)
  await mkdir(path.dirname(path.resolve(target)), { recursive: true })
  await writeFile(target, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
}

/**
 * A missing directory is a config error, not an empty result. Scanning a
 * mistyped path would otherwise produce a confident, entirely empty report.
 */
async function assertDirectory(dir: string, cwd: string | undefined, label: string): Promise<void> {
  const resolved = cwd === undefined ? dir : path.join(cwd, dir)
  try {
    if ((await stat(resolved)).isDirectory()) return
  } catch {
    throw new ConfigError(`${label} is not a directory: ${dir}`)
  }
  throw new ConfigError(`${label} is not a directory: ${dir}`)
}
