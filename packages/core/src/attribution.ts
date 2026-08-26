import { makeKeyId, parseKeyId } from './key-id'
import type { FileScan, KeyId, Locale, LocaleCatalog, Namespace } from './types'

/**
 * How a declared key earns its life, strongest first. The order is the
 * partition's priority: a key claimed several ways lands in the strongest
 * bucket, so every declared key belongs to exactly one.
 *
 * - `verified`  a file with a real binding names the key literally.
 * - `fog`       a bound file's dynamic pattern covers it; the namespace is
 *               known, the exact key is not.
 * - `widening`  only an `unattributed` file claims it. Both its literal keys
 *               and its patterns count as widening: when the namespace itself
 *               is unknown, that is the deeper blindness, so it wins over the
 *               pattern/literal distinction inside such a file.
 */
export type ClaimKind = 'verified' | 'fog' | 'widening'

export type Attributed = {
  /** Locales declaring this key, sorted. */
  locales: Locale[]
  /** Strongest claim, or `undefined` when nothing claims the key — it is dead. */
  claim: ClaimKind | undefined
}

/**
 * The single place the attribution rule (CLAUDE.md) is implemented.
 * `findDeadKeys` and `classifyKeys` both read from here so they cannot drift.
 */
export function attribute(catalog: LocaleCatalog, scans: FileScan[]): Map<KeyId, Attributed> {
  const declared = declarationsByKeyId(catalog)
  const allNamespaces = [...new Set([...declared.keys()].map((key) => parseKeyId(key).namespace))]

  const verified = new Set<KeyId>()
  const widened = new Set<KeyId>()
  const fogPrefixes: Prefix[] = []
  const widenedPrefixes: Prefix[] = []

  for (const scan of scans) {
    const widening = scan.unattributed
    const bound = widening ? allNamespaces : scan.namespaces

    for (const namespace of bound) {
      for (const key of scan.keys) {
        ;(widening ? widened : verified).add(makeKeyId(namespace, key))
      }
      for (const pattern of scan.dynamicPatterns) {
        ;(widening ? widenedPrefixes : fogPrefixes).push({
          namespace,
          prefix: fogPrefix(pattern),
        })
      }
    }
  }

  const attributed = new Map<KeyId, Attributed>()
  for (const [keyId, locales] of declared) {
    attributed.set(keyId, { locales, claim: claimFor(keyId) })
  }
  return attributed

  function claimFor(keyId: KeyId): ClaimKind | undefined {
    if (verified.has(keyId)) return 'verified'
    const { namespace, key } = parseKeyId(keyId)
    if (covers(fogPrefixes, namespace, key)) return 'fog'
    if (widened.has(keyId) || covers(widenedPrefixes, namespace, key)) return 'widening'
    return undefined
  }
}

type Prefix = { namespace: Namespace; prefix: string }

function covers(prefixes: Prefix[], namespace: Namespace, key: string): boolean {
  return prefixes.some((patch) => patch.namespace === namespace && key.startsWith(patch.prefix))
}

/**
 * The literal head of a dynamic pattern: everything before the first `*`.
 * `errors.*` fogs the `errors.` subtree. A pattern with an interior wildcard
 * (`a.*.b`) fogs all of `a.` — deliberately wider than the pattern strictly
 * describes, because over-fogging keeps keys alive and under-fogging deletes
 * live strings.
 */
function fogPrefix(pattern: string): string {
  const star = pattern.indexOf('*')
  return star === -1 ? pattern : pattern.slice(0, star)
}

/** KeyId -> the locales declaring it, both sorted for a deterministic order. */
function declarationsByKeyId(catalog: LocaleCatalog): Map<KeyId, Locale[]> {
  const declared = new Map<KeyId, Locale[]>()
  for (const locale of Object.keys(catalog).sort()) {
    for (const keyId of Object.keys(catalog[locale] ?? {}).sort()) {
      declared.set(keyId, [...(declared.get(keyId) ?? []), locale])
    }
  }
  return new Map([...declared].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
}
