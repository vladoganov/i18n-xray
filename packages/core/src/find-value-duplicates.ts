import { parseKeyId } from './key-id'
import type { Finding, KeyId, LocaleCatalog } from './types'

/**
 * The headline finding: the same text under different keys in more than one
 * namespace, within a single locale. Repeats *inside* one namespace are not
 * findings (decision A2) — consolidating those is a different job.
 */
export function findValueDuplicates(catalog: LocaleCatalog): Finding[] {
  const findings: Finding[] = []

  for (const locale of Object.keys(catalog).sort()) {
    const messages = catalog[locale] ?? {}
    const byValue = new Map<string, KeyId[]>()

    for (const key of Object.keys(messages).sort()) {
      const value = messages[key]
      if (value === undefined) continue
      byValue.set(value, [...(byValue.get(value) ?? []), key])
    }

    for (const [value, keys] of byValue) {
      const namespaces = new Set(keys.map((key) => parseKeyId(key).namespace))
      if (namespaces.size > 1) findings.push({ kind: 'value-duplicate', value, keys, locale })
    }
  }

  return findings
}
