import { useTranslation } from 'react-i18next'

// CASE 5 — fog: the key is computed from a template literal, so its concrete
// value is unknowable by regex. The scanner must emit the pattern `errors.*`
// into `dynamicPatterns` and must NOT invent concrete key findings from it
// (Constitution rule 1). That pattern fogs the `errors.*` subtree of this
// file's bound namespace, so `checkout:errors.declined` and
// `checkout:errors.expired` — neither of which is ever named literally
// anywhere in this fixture — must NOT be reported dead.
export function ErrorBanner({ code }: { code: string }) {
  const { t } = useTranslation('checkout')

  return <p role="alert">{t(`errors.${code}`)}</p>
}
