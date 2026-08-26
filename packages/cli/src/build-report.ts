import { classifyKeys, parseKeyId } from '@i18n-xray/core'
import type { FileScan, Finding, LocaleCatalog } from '@i18n-xray/core'
import { FINDING_KINDS } from '@i18n-xray/contracts'
import type { Report, ScanConfig } from '@i18n-xray/contracts'

/**
 * Assemble `report.json`. Every number here is a count of something already
 * computed — no analysis happens in the CLI, only arithmetic and shaping.
 *
 * The document is deterministic by construction: no timestamps, findings in the
 * analyses' fixed order, file scans sorted by path. Two runs over unchanged
 * inputs are byte-identical, which is what lets the gate snapshot it.
 */
export function buildReport(input: {
  config: ScanConfig
  catalog: LocaleCatalog
  scans: FileScan[]
  findings: Finding[]
  silenceWarning: boolean
}): Report {
  const { config, catalog, scans, findings, silenceWarning } = input
  const keys = classifyKeys(catalog, scans)

  // Distinct KeyIds per namespace, across every locale. The viewer sizes its
  // treemap by this and cannot recompute it from findings alone.
  const keysByNamespace = new Map<string, Set<string>>()
  for (const messages of Object.values(catalog)) {
    for (const keyId of Object.keys(messages)) {
      const { namespace } = parseKeyId(keyId)
      const declared = keysByNamespace.get(namespace) ?? new Set<string>()
      declared.add(keyId)
      keysByNamespace.set(namespace, declared)
    }
  }

  const findingsByKind = {
    'dead-key': 0,
    'value-duplicate': 0,
    'locale-gap': 0,
    convention: 0,
  }
  for (const finding of findings) findingsByKind[finding.kind] += 1

  return {
    config,
    summary: {
      totals: {
        namespaces: keysByNamespace.size,
        locales: Object.keys(catalog).length,
        keys: keys.total,
        files: scans.length,
        findings: findings.length,
        findingsByKind,
      },
      keys: {
        total: keys.total,
        verified: keys.verified.length,
        fogAlive: keys.fogAlive.length,
        wideningAlive: keys.wideningAlive.length,
        dead: keys.dead.length,
        fogPct: share(keys.fogAlive.length, keys.total),
        unattributedPct: share(keys.wideningAlive.length, keys.total),
      },
      namespaces: [...keysByNamespace]
        .map(([name, declared]) => ({ name, keys: declared.size }))
        .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)),
      files: {
        total: scans.length,
        withBindings: scans.filter((scan) => scan.namespaces.length > 0).length,
        unattributed: scans.filter((scan) => scan.unattributed).length,
        withDynamicPatterns: scans.filter((scan) => scan.dynamicPatterns.length > 0).length,
      },
      silenceWarning,
    },
    findings,
    fileScans: [...scans].sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0)),
  }
}

/** Percentage to one decimal. An empty catalog is 0%, not NaN. */
function share(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10
}

export const ALL_FINDING_KINDS = FINDING_KINDS
