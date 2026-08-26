import { Command, CommanderError } from 'commander'
import { FINDING_KINDS } from '@i18n-xray/contracts'
import type { FindingKind, Report } from '@i18n-xray/contracts'
import {
  ConfigError,
  DEFAULT_HOOKS,
  DEFAULT_LOCALES_PATTERN,
  DEFAULT_MAX_NAMESPACES_PER_FILE,
  runScan,
  writeReport,
} from './scan'

export const EXIT_OK = 0
export const EXIT_FINDINGS = 1
export const EXIT_CONFIG = 2

export type Streams = { out: (line: string) => void; err: (line: string) => void }

/**
 * Parse argv and run. Returns the process exit code instead of calling
 * `process.exit`, so the exit-code contract is testable without a subprocess.
 */
export async function main(argv: string[], streams: Streams): Promise<number> {
  const program = new Command()
    .name('i18n-xray')
    .description('X-ray for your i18n: static analysis of i18next translation usage.')
    .exitOverride()
    .configureOutput({
      writeOut: (text) => streams.out(text.replace(/\n$/, '')),
      writeErr: (text) => streams.err(text.replace(/\n$/, '')),
    })

  let exitCode = EXIT_OK

  program
    .command('scan')
    .description('Analyze translation usage and emit findings.')
    .argument('[srcDir]', 'directory of source files to scan', 'src')
    .argument('[localesDir]', 'directory of locale files', 'locales')
    .option('--hook <names...>', 'hook name(s) binding t', DEFAULT_HOOKS)
    .option('--locales-pattern <pattern>', 'locale file layout', DEFAULT_LOCALES_PATTERN)
    .option(
      '--max-namespaces-per-file <n>',
      'convention check threshold',
      String(DEFAULT_MAX_NAMESPACES_PER_FILE),
    )
    .option('--json <path>', 'write report.json to this path')
    .option('--fail-on <kinds...>', `exit 1 if present: ${FINDING_KINDS.join(', ')}`)
    .action(async (srcDir: string, localesDir: string, options: RawScanOptions) => {
      const outcome = await runScan({
        srcDir,
        localesDir,
        hooks: options.hook,
        localesPattern: options.localesPattern,
        maxNamespacesPerFile: parseThreshold(options.maxNamespacesPerFile),
        failOn: parseFailOn(options.failOn),
      })

      if (outcome.report.summary.silenceWarning) reportSilence(streams)
      if (options.json !== undefined) {
        await writeReport(outcome.report, options.json)
        streams.out(`Wrote ${options.json}`)
      }
      printSummary(outcome.report, streams)
      for (const reason of outcome.reasons) streams.err(`FAIL  ${reason}`)

      exitCode = outcome.exitCode
    })

  try {
    await program.parseAsync(argv, { from: 'user' })
  } catch (error) {
    return handleFailure(error, streams)
  }
  return exitCode
}

type RawScanOptions = {
  hook: string[]
  localesPattern: string
  maxNamespacesPerFile: string
  json?: string
  failOn?: string[]
}

function parseThreshold(raw: string): number {
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 0) {
    throw new ConfigError(`--max-namespaces-per-file must be a non-negative integer, got: ${raw}`)
  }
  return value
}

function parseFailOn(raw: string[] | undefined): FindingKind[] {
  if (raw === undefined) return []
  const known = new Set<string>(FINDING_KINDS)
  const unknown = raw.filter((kind) => !known.has(kind))
  if (unknown.length > 0) {
    throw new ConfigError(
      `--fail-on accepts ${FINDING_KINDS.join(', ')}; got: ${unknown.join(', ')}`,
    )
  }
  return raw as FindingKind[]
}

/** Constitution rule 3 asks for a loud warning. This is the loud part. */
function reportSilence(streams: Streams): void {
  streams.err('')
  streams.err('!! SUSPICIOUS SILENCE '.padEnd(72, '!'))
  streams.err('!! Found t() calls but ZERO hook bindings anywhere in the scanned files.')
  streams.err('!! The configured --hook name is probably wrong: many codebases wrap')
  streams.err('!! useTranslation in their own hook. Every finding below is unreliable.')
  streams.err('!! Re-run with --hook <yourWrapperHook>.')
  streams.err('!'.repeat(72))
  streams.err('')
}

function printSummary(report: Report, streams: Streams): void {
  const { totals, keys, files } = report.summary
  streams.out(
    `Scanned ${totals.files} files, ${totals.keys} keys across ` +
      `${totals.namespaces} namespaces and ${totals.locales} locales.`,
  )
  streams.out(
    `Coverage: ${keys.verified} verified, ${keys.fogAlive} fogged (${keys.fogPct}%), ` +
      `${keys.wideningAlive} unattributed (${keys.unattributedPct}%), ${keys.dead} dead.`,
  )
  streams.out(
    `Files: ${files.withBindings} with bindings, ${files.unattributed} unattributed, ` +
      `${files.withDynamicPatterns} with dynamic keys.`,
  )
  streams.out(`Findings: ${totals.findings}`)
  for (const kind of FINDING_KINDS) {
    const count = totals.findingsByKind[kind]
    if (count > 0) streams.out(`  ${kind}: ${count}`)
  }
}

function handleFailure(error: unknown, streams: Streams): number {
  if (error instanceof CommanderError) {
    // --help and --version are successful exits that commander throws on.
    return error.code.startsWith('commander.help') || error.code === 'commander.version'
      ? error.exitCode
      : EXIT_CONFIG
  }
  streams.err(`error: ${error instanceof Error ? error.message : String(error)}`)
  return EXIT_CONFIG
}
