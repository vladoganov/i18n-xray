import type { Finding, KeyId, Locale, LocaleCatalog } from './types'

/**
 * A key declared in some locales but not others. Pure locale-data analysis —
 * usage plays no part, so a gap is reported whether or not the key is alive.
 */
export function findLocaleGaps(catalog: LocaleCatalog): Finding[] {
  const locales = Object.keys(catalog).sort()
  const findings: Finding[] = []

  for (const key of everyKeyId(catalog)) {
    const presentIn = locales.filter((locale) => declares(catalog, locale, key))
    const missingIn = locales.filter((locale) => !declares(catalog, locale, key))
    if (missingIn.length > 0) findings.push({ kind: 'locale-gap', key, presentIn, missingIn })
  }

  return findings
}

function declares(catalog: LocaleCatalog, locale: Locale, key: KeyId): boolean {
  const messages = catalog[locale]
  return messages !== undefined && Object.hasOwn(messages, key)
}

/** Union of every KeyId across every locale, sorted for a deterministic order. */
function everyKeyId(catalog: LocaleCatalog): KeyId[] {
  return [...new Set(Object.values(catalog).flatMap((messages) => Object.keys(messages)))].sort()
}
