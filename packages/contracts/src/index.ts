/**
 * Zod schemas shared across the toolchain. `report.json` is the only interface
 * between the analyzer and the viewer (Constitution rule 4).
 */
export const PACKAGE_NAME = '@i18n-xray/contracts'

export * from './report'
