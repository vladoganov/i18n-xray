/**
 * Domain types. `KeyId`, `Finding` and `FileScan` mirror the authoritative data
 * model in CLAUDE.md verbatim; the locale shapes below are the plain-data
 * carriers the analysis functions consume.
 */

/** `"ns:a.b.c"` — namespace-prefixed, flattened. */
export type KeyId = string
export type Locale = string
export type Namespace = string

/** Nested i18next JSON, exactly as it sits in a locale file. */
export type NestedMessages = { [segment: string]: string | NestedMessages }

/**
 * locale -> namespace -> nested messages. What a loader hands to
 * `flattenLocales`. Conforming the raw `JSON.parse` output to this shape is the
 * adapter's job — `core` trusts the type.
 */
export type LocaleSources = Record<Locale, Record<Namespace, NestedMessages>>

/** locale -> KeyId -> message. The flattened form every analysis reads. */
export type LocaleCatalog = Record<Locale, Record<KeyId, string>>

export type FileScan = {
  file: string
  namespaces: string[]
  keys: string[]
  dynamicPatterns: string[]
  unattributed: boolean
}

export type Finding =
  | { kind: 'dead-key'; key: KeyId; locales: Locale[] }
  | { kind: 'value-duplicate'; value: string; keys: KeyId[]; locale: Locale }
  | { kind: 'locale-gap'; key: KeyId; presentIn: Locale[]; missingIn: Locale[] }
  | { kind: 'convention'; file: string; namespaces: string[] }
