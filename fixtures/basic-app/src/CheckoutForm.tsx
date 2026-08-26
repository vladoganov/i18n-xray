import { useTranslation } from 'react-i18next'
import { PriceLabel } from './PriceLabel'

export function CheckoutForm() {
  const { t } = useTranslation('checkout')

  return (
    <form>
      {/* CASE 6 (setup) — `t` is handed to a child as a prop. This call site is
          fine; the problem lives in PriceLabel.tsx, which sees no hook. Note
          `t={t}` is a bare identifier, not a call, so it must NOT be collected
          as a key here. */}
      <PriceLabel t={t} />

      {/* CASE 2 — value-duplicate (second half): `checkout:buttons.cancel` is
          "Cancel" in en, byte-identical to `common:actions.cancel`. Referenced
          here so the duplicate is its only finding. */}
      <button type="button">{t('buttons.cancel')}</button>
    </form>
  )
}
