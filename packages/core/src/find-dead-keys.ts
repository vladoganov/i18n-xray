import { makeKeyId, parseKeyId } from './key-id'
import type { FileScan, Finding, KeyId, Locale, LocaleCatalog, Namespace } from './types'

/**
 * Declared keys that no file can be shown to use.
 *
 * The attribution rule (CLAUDE.md) drives everything here:
 *
 * - every key in a scan counts as used in *every* namespace that scan binds —
 *   over-attribution, so a key alive in one binding survives in all of them;
 * - a dynamic pattern fogs its matching subtree inside those same namespaces,
 *   keeping keys alive without ever naming one;
 * - `unattributed: true` widens the scan's namespace set to ALL namespaces, so
 *   its keys and patterns attribute repo-wide (decision A1(b)).
 *
 * Every mechanism above only ever *adds* to the alive set. A key is reported
 * dead solely because nothing claimed it, which is what makes false positives
 * structurally impossible here (Constitution rule 2).
 */
export function findDeadKeys(catalog: LocaleCatalog, scans: FileScan[]): Finding[] {
  const declared = declarationsByKeyId(catalog)
  const allNamespaces = [...new Set([...declared.keys()].map((key) => parseKeyId(key).namespace))]

  const alive = new Set<KeyId>()
  const fog: Array<{ namespace: Namespace; prefix: string }> = []

  for (const scan of scans) {
    const bound = scan.unattributed ? allNamespaces : scan.namespaces
    for (const namespace of bound) {
      for (const key of scan.keys) alive.add(makeKeyId(namespace, key))
      for (const pattern of scan.dynamicPatterns)
        fog.push({ namespace, prefix: fogPrefix(pattern) })
    }
  }

  const findings: Finding[] = []
  for (const [keyId, locales] of declared) {
    if (alive.has(keyId)) continue
    const { namespace, key } = parseKeyId(keyId)
    const fogged = fog.some(
      (patch) => patch.namespace === namespace && key.startsWith(patch.prefix),
    )
    if (fogged) continue
    findings.push({ kind: 'dead-key', key: keyId, locales })
  }

  return findings
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
