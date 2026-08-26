import { attribute } from './attribution'
import type { FileScan, KeyId, LocaleCatalog } from './types'

/**
 * The four-way partition behind the report's fog and unattributed percentages.
 *
 * Priority: verified > fog-alive > widening-alive > dead. Every declared key
 * lands in exactly one bucket, so the counts sum to `total` and
 * `(fogAlive + wideningAlive) / total` is the share of keys the analyzer cannot
 * judge — the number Stage 6 thresholds at ~50%.
 */
export type KeyClassification = {
  total: number
  /** A bound file names the key literally. */
  verified: KeyId[]
  /** Only a bound file's dynamic pattern covers it. */
  fogAlive: KeyId[]
  /** Only an `unattributed` file's widening reaches it. */
  wideningAlive: KeyId[]
  /** Nothing claims it. Identical to `findDeadKeys`' output, by construction. */
  dead: KeyId[]
}

export function classifyKeys(catalog: LocaleCatalog, scans: FileScan[]): KeyClassification {
  const classification: KeyClassification = {
    total: 0,
    verified: [],
    fogAlive: [],
    wideningAlive: [],
    dead: [],
  }

  for (const [key, { claim }] of attribute(catalog, scans)) {
    classification.total += 1
    if (claim === 'verified') classification.verified.push(key)
    else if (claim === 'fog') classification.fogAlive.push(key)
    else if (claim === 'widening') classification.wideningAlive.push(key)
    else classification.dead.push(key)
  }

  return classification
}
