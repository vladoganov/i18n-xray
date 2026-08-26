import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { flattenLocales } from '@i18n-xray/core'
import type { LocaleCatalog, LocaleSources, NestedMessages } from '@i18n-xray/core'
import { compileLocalesPattern } from './locales-pattern'
import fg from 'fast-glob'

export const DEFAULT_LOCALES_PATTERN = '{locale}/{ns}.json'

export type LoadLocalesOptions = {
  /** Layout of the locale files inside `localesDir`. */
  pattern?: string
  /** Directory `localesDir` is resolved against. Defaults to the process cwd. */
  cwd?: string
}

/**
 * Read every locale file under `localesDir` and return the flattened catalog.
 * Globbing and reading happen here; the flattening itself is `core`'s.
 */
export async function loadLocales(
  localesDir: string,
  options: LoadLocalesOptions = {},
): Promise<LocaleCatalog> {
  const { glob, match } = compileLocalesPattern(options.pattern ?? DEFAULT_LOCALES_PATTERN)
  const base = options.cwd === undefined ? localesDir : path.join(options.cwd, localesDir)
  const relatives = (await fg(glob, { cwd: base, onlyFiles: true })).sort()

  const sources: LocaleSources = {}
  for (const relative of relatives) {
    const groups = match.exec(relative)?.groups
    const locale = groups?.['locale']
    const ns = groups?.['ns']
    if (locale === undefined || ns === undefined) continue

    const raw = await readFile(path.join(base, relative), 'utf8')
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch (cause) {
      throw new Error(`Invalid JSON in locale file: ${path.join(localesDir, relative)}`, { cause })
    }

    sources[locale] ??= {}
    sources[locale][ns] = toNestedMessages(parsed)
  }

  return flattenLocales(sources)
}

/**
 * Conform raw `JSON.parse` output to `NestedMessages`. Objects (including
 * arrays, which flatten to `list.0`, `list.1`, …) recurse; strings are kept.
 * Anything else — numbers, booleans, null — is dropped rather than coerced: an
 * undeclared key can never be reported dead, so dropping is the safe direction.
 */
function toNestedMessages(value: unknown): NestedMessages {
  const messages: NestedMessages = {}
  if (typeof value !== 'object' || value === null) return messages

  for (const [segment, nested] of Object.entries(value)) {
    if (typeof nested === 'string') messages[segment] = nested
    else if (typeof nested === 'object' && nested !== null) {
      messages[segment] = toNestedMessages(nested)
    }
  }

  return messages
}
