/**
 * Stage 4 gate: report.json snapshot + schema validation, the §G silence matrix,
 * and the exit-code contract.
 *
 * `runScan` takes an explicit `cwd`, so srcDir/localesDir stay relative and the
 * snapshot contains no machine-specific paths. The exit-code tests go through
 * `main()` instead, to exercise real flag parsing and error mapping.
 */
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ReportSchema } from '@i18n-xray/contracts'
import { EXIT_CONFIG, EXIT_FINDINGS, EXIT_OK, main, runScan } from './index'
import type { ScanRequest, Streams } from './index'

const FIXTURE = fileURLToPath(new URL('../../../fixtures/basic-app', import.meta.url))

const BASE: Omit<ScanRequest, 'hooks'> = {
  srcDir: 'src',
  localesDir: 'locales',
  localesPattern: '{locale}/{ns}.json',
  maxNamespacesPerFile: 1,
  failOn: [],
  cwd: FIXTURE,
}

const defaultRun = await runScan({ ...BASE, hooks: ['useTranslation'] })
const wrapperRun = await runScan({ ...BASE, hooks: ['useTranslation', 'useAppTranslation'] })

describe('report.json — schema', () => {
  it('validates against the contracts schema', () => {
    expect(() => ReportSchema.parse(defaultRun.report)).not.toThrow()
    expect(() => ReportSchema.parse(wrapperRun.report)).not.toThrow()
  })

  it('rejects an unknown field, so core/contracts drift fails loudly', () => {
    const drifted = { ...defaultRun.report, generatedAt: '2026-08-26T00:00:00Z' }
    expect(() => ReportSchema.parse(drifted)).toThrow()
  })

  it('rejects a summary whose buckets do not fit the schema', () => {
    const broken = structuredClone(defaultRun.report)
    broken.summary.keys.fogPct = 101
    expect(() => ReportSchema.parse(broken)).toThrow()
  })
})

describe('report.json — snapshot', () => {
  it('default run matches the committed snapshot', async () => {
    await expect(`${JSON.stringify(defaultRun.report, null, 2)}\n`).toMatchFileSnapshot(
      './__snapshots__/report.default-run.json',
    )
  })

  it('wrapper run matches the committed snapshot', async () => {
    await expect(`${JSON.stringify(wrapperRun.report, null, 2)}\n`).toMatchFileSnapshot(
      './__snapshots__/report.wrapper-run.json',
    )
  })

  it('is deterministic — a second run is byte-identical', async () => {
    const again = await runScan({ ...BASE, hooks: ['useTranslation'] })
    expect(JSON.stringify(again.report)).toBe(JSON.stringify(defaultRun.report))
  })
})

describe('summary — the §H counts and the approved formulas', () => {
  it('default run: 7 verified / 2 fog / 4 widening / 1 dead of 14', () => {
    expect(defaultRun.report.summary.keys).toEqual({
      total: 14,
      verified: 7,
      fogAlive: 2,
      wideningAlive: 4,
      dead: 1,
      fogPct: 14.3,
      unattributedPct: 28.6,
    })
  })

  it('wrapper run: 8 verified / 2 fog / 2 widening / 2 dead of 14', () => {
    expect(wrapperRun.report.summary.keys).toEqual({
      total: 14,
      verified: 8,
      fogAlive: 2,
      wideningAlive: 2,
      dead: 2,
      fogPct: 14.3,
      unattributedPct: 14.3,
    })
  })

  it('the four buckets sum to the key total', () => {
    for (const { report } of [defaultRun, wrapperRun]) {
      const { total, verified, fogAlive, wideningAlive, dead } = report.summary.keys
      expect(verified + fogAlive + wideningAlive + dead).toBe(total)
    }
  })

  it('carries §H totals and the file-level rows as secondary info', () => {
    expect(defaultRun.report.summary.totals).toMatchObject({
      namespaces: 3,
      locales: 2,
      keys: 14,
      files: 7,
      findings: 4,
    })
    expect(defaultRun.report.summary.files).toEqual({
      total: 7,
      withBindings: 4,
      unattributed: 2,
      withDynamicPatterns: 1,
    })
    expect(wrapperRun.report.summary.files).toEqual({
      total: 7,
      withBindings: 5,
      unattributed: 1,
      withDynamicPatterns: 1,
    })
  })

  it('Stage 6 reads fogPct + unattributedPct as one number', () => {
    const { fogPct, unattributedPct } = defaultRun.report.summary.keys
    expect(fogPct + unattributedPct).toBeCloseTo(42.9, 1)
  })
})

describe('§G — the silence-warning matrix, all four rows', () => {
  it.each([
    ['--hook useTranslation (default)', 4, false, ['useTranslation']],
    ['--hook useTranslation useAppTranslation', 5, false, ['useTranslation', 'useAppTranslation']],
    ['--hook useAppTranslation (alone)', 1, false, ['useAppTranslation']],
    ['--hook useNothing', 0, true, ['useNothing']],
  ])('%s — %i binding files, warns: %s', async (_label, bindingFiles, warns, hooks) => {
    const { report } = await runScan({ ...BASE, hooks })
    expect(report.summary.files.withBindings).toBe(bindingFiles)
    expect(report.summary.files.total - report.summary.files.withBindings).toBeGreaterThan(0)
    expect(report.summary.silenceWarning).toBe(warns)
  })

  it('is a zero-bindings check, never a threshold: one binding file is enough', async () => {
    // Row 3 is the load-bearing one. Six of seven files are missed under
    // --hook useAppTranslation, yet a single binding keeps the warning quiet.
    const { report } = await runScan({ ...BASE, hooks: ['useAppTranslation'] })
    expect(report.summary.files.withBindings).toBe(1)
    expect(report.summary.files.unattributed).toBe(5)
    expect(report.summary.silenceWarning).toBe(false)
  })
})

describe('exit codes', () => {
  let out: string[]
  let err: string[]
  let streams: Streams
  let previousCwd: string

  beforeEach(() => {
    out = []
    err = []
    streams = { out: (line) => out.push(line), err: (line) => err.push(line) }
    previousCwd = process.cwd()
    process.chdir(FIXTURE)
  })

  afterEach(() => {
    process.chdir(previousCwd)
  })

  it('0 — findings present but no --fail-on', async () => {
    expect(await main(['scan', 'src', 'locales'], streams)).toBe(EXIT_OK)
    expect(out.join('\n')).toContain('Findings: 4')
  })

  it('0 — --fail-on names a kind with no findings', async () => {
    const code = await main(
      ['scan', 'src', 'locales', '--max-namespaces-per-file', '2', '--fail-on', 'convention'],
      streams,
    )
    expect(code).toBe(EXIT_OK)
  })

  it('1 — --fail-on names a kind that is present', async () => {
    const code = await main(['scan', 'src', 'locales', '--fail-on', 'dead-key'], streams)
    expect(code).toBe(EXIT_FINDINGS)
    expect(err.join('\n')).toContain('--fail-on dead-key: 1 found')
  })

  it('1 — silence under --fail-on, even for a kind with zero findings', async () => {
    const code = await main(
      [
        'scan',
        'src',
        'locales',
        '--hook',
        'useNothing',
        '--max-namespaces-per-file',
        '2',
        '--fail-on',
        'convention',
      ],
      streams,
    )
    expect(code).toBe(EXIT_FINDINGS)
    expect(err.join('\n')).toContain('suspicious silence')
    expect(err.join('\n')).toContain('SUSPICIOUS SILENCE')
  })

  it('0 — silence warns loudly but is not fatal without --fail-on', async () => {
    const code = await main(['scan', 'src', 'locales', '--hook', 'useNothing'], streams)
    expect(code).toBe(EXIT_OK)
    expect(err.join('\n')).toContain('SUSPICIOUS SILENCE')
  })

  it('2 — unknown --fail-on kind', async () => {
    const code = await main(['scan', 'src', 'locales', '--fail-on', 'not-a-kind'], streams)
    expect(code).toBe(EXIT_CONFIG)
    expect(err.join('\n')).toContain('--fail-on accepts')
  })

  it('2 — non-integer --max-namespaces-per-file', async () => {
    const code = await main(
      ['scan', 'src', 'locales', '--max-namespaces-per-file', 'lots'],
      streams,
    )
    expect(code).toBe(EXIT_CONFIG)
  })

  it('2 — locales pattern missing a placeholder', async () => {
    const code = await main(
      ['scan', 'src', 'locales', '--locales-pattern', '{locale}.json'],
      streams,
    )
    expect(code).toBe(EXIT_CONFIG)
    expect(err.join('\n')).toContain('must contain {ns}')
  })

  it('2 — srcDir does not exist, rather than a confident empty report', async () => {
    const code = await main(['scan', 'nope', 'locales'], streams)
    expect(code).toBe(EXIT_CONFIG)
    expect(err.join('\n')).toContain('srcDir is not a directory')
  })

  it('2 — unknown flag', async () => {
    expect(await main(['scan', '--nonsense'], streams)).toBe(EXIT_CONFIG)
  })

  it('writes report.json where --json points', async () => {
    const target = `${process.cwd()}/../../packages/cli/node_modules/.tmp/report.json`
    const code = await main(['scan', 'src', 'locales', '--json', target], streams)
    expect(code).toBe(EXIT_OK)
    const written = await import('node:fs/promises').then((fs) => fs.readFile(target, 'utf8'))
    expect(ReportSchema.parse(JSON.parse(written)).summary.keys.total).toBe(14)
  })
})
