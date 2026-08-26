import { useTranslation } from 'react-i18next'
import { AdminPanel } from './AdminPanel'
import { CheckoutForm } from './CheckoutForm'
import { CheckoutSummary } from './CheckoutSummary'
import { ErrorBanner } from './ErrorBanner'

// Well-behaved baseline: one namespace, literal keys only.
// Expected FileScan: namespaces ['common'], keys ['beta.badge', 'cta.save',
// 'actions.cancel'], no dynamic patterns, unattributed false.
export function App() {
  const { t } = useTranslation('common')

  return (
    <main>
      <header>
        {/* CASE 3 — locale-gap: `common:beta.badge` exists in en and is missing
            in pl. It is referenced here on purpose so that it is ALIVE: the only
            finding it may yield is the locale gap, never a dead key. */}
        <span className="badge">{t('beta.badge')}</span>

        {/* CASE 2 — value-duplicate (first half): `common:actions.cancel` is
            "Cancel" in en, byte-identical to `checkout:buttons.cancel`.
            Referenced here so the duplicate is its only finding. */}
        <button type="button">{t('actions.cancel')}</button>

        <button type="submit">{t('cta.save')}</button>
      </header>

      {/* CASE 1 — dead-key: `common:legacy.tooltip` is declared in en and pl and
          is deliberately referenced NOWHERE in this fixture. No literal key and
          no dynamic pattern matches it, so nothing fogs it. It must be reported
          as a dead key in every run. JSON cannot carry comments, so this is the
          marker for it; see EXPECTED.md row 1. */}

      <CheckoutSummary />
      <CheckoutForm />
      <ErrorBanner code="declined" />
      <AdminPanel />
    </main>
  )
}
