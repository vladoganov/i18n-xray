import { useTranslation } from 'react-i18next'

// CASE 7 (setup) — the wrapper hook that makes real codebases invisible to a
// default scan. Note the namespace arrives as a variable, so there is no string
// literal here for the scanner to bind. Expected FileScan in BOTH runs: no
// namespaces, no keys, no dynamic patterns, and `unattributed: false` because
// the file contains no `t(` call at all.
export function useAppTranslation(ns: string) {
  return useTranslation(ns)
}
