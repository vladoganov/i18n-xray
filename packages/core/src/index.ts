/**
 * Pure domain: plain data in, `Finding[]` out. No fs, no globs, no process, no
 * framework imports.
 */
export const PACKAGE_NAME = '@i18n-xray/core'

export { flattenLocales } from './flatten-locales'
export { findDeadKeys } from './find-dead-keys'
export { findLocaleGaps } from './find-locale-gaps'
export { findValueDuplicates } from './find-value-duplicates'
export { checkConventions } from './check-conventions'
export type {
  FileScan,
  Finding,
  KeyId,
  Locale,
  LocaleCatalog,
  LocaleSources,
  Namespace,
  NestedMessages,
} from './types'
