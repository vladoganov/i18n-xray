import { useTranslation } from 'react-i18next'

// CASE 4 — over-attribution: this ONE file binds two namespaces. The scanner
// works at file granularity and cannot tell which `t` a call belongs to, so
// every key here counts as ALIVE in BOTH `common` and `checkout`. Concretely:
// `t('title')` is called once, but `common:title` AND `checkout:title` must
// both survive. Keeping a genuinely unused key alive is an accepted false
// negative (Constitution rule 2); reporting a live key dead is never allowed.
//
// CASE 8 — convention: this file binds 2 namespaces, which is above the default
// --max-namespaces-per-file 1, so it must yield exactly one `convention`
// finding naming both namespaces.
export function CheckoutSummary() {
  return (
    <section>
      <SummaryHeader />
      <SummaryTotals />
    </section>
  )
}

function SummaryHeader() {
  const { t } = useTranslation('common')

  // Really resolves to common:title — but the scanner must not assume that.
  return <h1>{t('title')}</h1>
}

function SummaryTotals() {
  const { t } = useTranslation('checkout')

  return <p>{t('totals.grandTotal')}</p>
}
