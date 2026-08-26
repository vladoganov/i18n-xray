/**
 * Renders `report.json` into a single self-contained HTML report — inline
 * CSS/JS, zero network requests.
 *
 * Depends on `contracts` only: the schema is the whole input contract, and the
 * viewer never reaches into `core`, `loader` or `scanner`.
 */
export const PACKAGE_NAME = '@i18n-xray/viewer'

export { renderReport } from './render-report'
export { severityForRate, SEVERITY_LABEL } from './severity'
export type { Severity } from './severity'
