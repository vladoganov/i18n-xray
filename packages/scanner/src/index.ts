/**
 * Adapter: per-file regex extraction into `FileScan` — hook bindings, `t('...')`
 * key literals, template-literal fog patterns, unattributed detection.
 */
export const PACKAGE_NAME = '@i18n-xray/scanner'

export { scanSource, DEFAULT_HOOKS } from './scan-source'
export type { ScanOptions } from './scan-source'
export { scanDirectory, DEFAULT_SOURCE_GLOB } from './scan-directory'
export type { ScanDirectoryOptions } from './scan-directory'
export { stripComments } from './strip-comments'
