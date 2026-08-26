/**
 * Adapter: globs i18next JSON locale files and flattens nested keys to `KeyId`s.
 */
export const PACKAGE_NAME = '@i18n-xray/loader'

export { loadLocales, DEFAULT_LOCALES_PATTERN } from './load-locales'
export type { LoadLocalesOptions } from './load-locales'
export { compileLocalesPattern } from './locales-pattern'
export type { CompiledLocalesPattern } from './locales-pattern'
