import { makeKeyId } from './key-id'
import type { LocaleCatalog, LocaleSources, NestedMessages } from './types'

/**
 * Flatten nested locale JSON into namespace-prefixed `KeyId`s.
 *
 *   { common: { cta: { save: 'Save' } } }  ->  { 'common:cta.save': 'Save' }
 */
export function flattenLocales(sources: LocaleSources): LocaleCatalog {
  const catalog: LocaleCatalog = {}

  for (const [locale, namespaces] of Object.entries(sources)) {
    const flat: Record<string, string> = {}
    for (const [namespace, messages] of Object.entries(namespaces)) {
      for (const [key, value] of flatten(messages)) {
        flat[makeKeyId(namespace, key)] = value
      }
    }
    catalog[locale] = flat
  }

  return catalog
}

function* flatten(messages: NestedMessages, prefix = ''): Generator<[string, string]> {
  for (const [segment, value] of Object.entries(messages)) {
    const path = prefix === '' ? segment : `${prefix}.${segment}`
    if (typeof value === 'string') yield [path, value]
    else yield* flatten(value, path)
  }
}
