/**
 * One vocabulary for "how bad is this", shared by the header's coverage bar and
 * the treemap tiles. These are the four reserved status roles — used here
 * because the encoding genuinely means good/bad, never as series identity.
 */
export type Severity = 'good' | 'warning' | 'serious' | 'critical'

/**
 * A namespace's issue rate is the share of its declared keys that are dead or
 * caught in a cross-namespace value duplicate. Thresholds are coarse on
 * purpose: the exact counts are printed on the tile, so colour only has to say
 * "look here first".
 */
export function severityForRate(rate: number): Severity {
  if (rate <= 0) return 'good'
  if (rate < 0.25) return 'warning'
  if (rate <= 0.5) return 'serious'
  return 'critical'
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  good: 'clean',
  warning: 'minor',
  serious: 'notable',
  critical: 'severe',
}
