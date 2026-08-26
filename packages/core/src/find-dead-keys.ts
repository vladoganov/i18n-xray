import { attribute } from './attribution'
import type { FileScan, Finding, LocaleCatalog } from './types'

/**
 * Declared keys that no file can be shown to use.
 *
 * Attribution lives in `./attribution`; a key is dead when nothing claims it
 * there — no literal reference, no fog pattern, no widening from an
 * unattributed file. Every one of those mechanisms only ever *adds* to the
 * alive set, which is what makes false positives structurally impossible here
 * (Constitution rule 2).
 */
export function findDeadKeys(catalog: LocaleCatalog, scans: FileScan[]): Finding[] {
  const findings: Finding[] = []
  for (const [key, { locales, claim }] of attribute(catalog, scans)) {
    if (claim === undefined) findings.push({ kind: 'dead-key', key, locales })
  }
  return findings
}
