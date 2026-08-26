/**
 * Hand-built mirror of `fixtures/basic-app`, transcribed from
 * `fixtures/basic-app/EXPECTED.md` §B2 (locale values) and §C1/§C2 (FileScans).
 *
 * Nothing here is read from disk — Stage 2 tests `core` as pure functions over
 * plain data. Reading the real fixture is Stage 3's integration test, and the
 * two agreeing is exactly what that test proves.
 */
import type { FileScan, LocaleSources } from './types'

/** §B2, nested exactly as the locale JSON nests it. */
export const SOURCES: LocaleSources = {
  en: {
    admin: {
      panel: { heading: 'Admin panel' },
      price: { label: 'Unit price' },
    },
    checkout: {
      title: 'Order summary',
      buttons: { cancel: 'Cancel' },
      totals: { grandTotal: 'Grand total' },
      errors: { declined: 'Your card was declined.', expired: 'Your card has expired.' },
      price: { label: 'Price' },
    },
    common: {
      title: 'Acme Store',
      cta: { save: 'Save' },
      actions: { cancel: 'Cancel' },
      beta: { badge: 'Beta' },
      legacy: { tooltip: 'Click to expand the legacy panel' },
      panel: { heading: 'Panel' },
    },
  },
  pl: {
    admin: {
      panel: { heading: 'Panel administracyjny' },
      price: { label: 'Cena jednostkowa' },
    },
    checkout: {
      title: 'Podsumowanie zamówienia',
      buttons: { cancel: 'Zrezygnuj' },
      totals: { grandTotal: 'Suma całkowita' },
      errors: { declined: 'Twoja karta została odrzucona.', expired: 'Twoja karta wygasła.' },
      price: { label: 'Cena' },
    },
    // §B2: `beta.badge` is deliberately absent here — that is case 3.
    common: {
      title: 'Sklep Acme',
      cta: { save: 'Zapisz' },
      actions: { cancel: 'Anuluj' },
      legacy: { tooltip: 'Kliknij, aby rozwinąć stary panel' },
      panel: { heading: 'Panel' },
    },
  },
}

/** §C1 — default run, `--hook useTranslation`. */
export const SCANS_DEFAULT_RUN: FileScan[] = [
  {
    file: 'src/App.tsx',
    namespaces: ['common'],
    keys: ['beta.badge', 'actions.cancel', 'cta.save'],
    dynamicPatterns: [],
    unattributed: false,
  },
  {
    file: 'src/CheckoutSummary.tsx',
    namespaces: ['common', 'checkout'],
    keys: ['title', 'totals.grandTotal'],
    dynamicPatterns: [],
    unattributed: false,
  },
  {
    file: 'src/CheckoutForm.tsx',
    namespaces: ['checkout'],
    keys: ['buttons.cancel'],
    dynamicPatterns: [],
    unattributed: false,
  },
  {
    file: 'src/ErrorBanner.tsx',
    namespaces: ['checkout'],
    keys: [],
    dynamicPatterns: ['errors.*'],
    unattributed: false,
  },
  {
    file: 'src/PriceLabel.tsx',
    namespaces: [],
    keys: ['price.label'],
    dynamicPatterns: [],
    unattributed: true,
  },
  {
    file: 'src/AdminPanel.tsx',
    namespaces: [],
    keys: ['panel.heading'],
    dynamicPatterns: [],
    unattributed: true,
  },
  {
    file: 'src/useAppTranslation.ts',
    namespaces: [],
    keys: [],
    dynamicPatterns: [],
    unattributed: false,
  },
]

/** §C2 — wrapper run, `--hook useTranslation useAppTranslation`. One row differs. */
export const SCANS_WRAPPER_RUN: FileScan[] = SCANS_DEFAULT_RUN.map((scan) =>
  scan.file === 'src/AdminPanel.tsx'
    ? {
        file: 'src/AdminPanel.tsx',
        namespaces: ['admin'],
        keys: ['panel.heading'],
        dynamicPatterns: [],
        unattributed: false,
      }
    : scan,
)

/** §D/§E fix the convention threshold at the CLI default. */
export const MAX_NAMESPACES_PER_FILE = 1
