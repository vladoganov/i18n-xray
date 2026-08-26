import { useAppTranslation } from './useAppTranslation'

// CASE 7 — wrapper hook. Under the default `--hook useTranslation` this binding
// is invisible: the file has a `t(` call but no recognised hook, so it lands in
// the same `unattributed` bucket as PriceLabel.tsx and `panel.heading` fogs
// every namespace. Under `--hook useTranslation useAppTranslation` the file
// binds `admin` properly and `panel.heading` attributes to `admin` alone.
//
// That difference is observable in the findings, not just in the FileScan:
// `common:panel.heading` is a stale leftover that the default run keeps alive
// by fog, and that the correctly configured run exposes as dead. Fixing the
// hook config finds MORE dead keys — it never resurrects a key.
export function AdminPanel() {
  const { t } = useAppTranslation('admin')

  return <h2>{t('panel.heading')}</h2>
}
