/**
 * Wiring, flags, and exit codes. The only published package; bundles the
 * internal packages at build time.
 */
export const PACKAGE_NAME = 'i18n-xray'

export { main, EXIT_OK, EXIT_FINDINGS, EXIT_CONFIG } from './cli'
export type { Streams } from './cli'
export { runScan, writeReport, detectSilence, ConfigError } from './scan'
export type { ScanRequest, ScanOutcome } from './scan'
export { buildReport } from './build-report'
