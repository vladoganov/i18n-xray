/**
 * The fixture is the acceptance spec; these cover scanner decisions it does not
 * exercise. Nothing here contradicts EXPECTED.md — it fills in the edges.
 */
import { expect, it } from 'vitest'
import { scanSource } from './index'

const scan = (source: string, hooks?: string[]) =>
  scanSource('x.tsx', source, hooks ? { hooks } : {})

it('reads the namespace from a hook call and keys from t() literals', () => {
  expect(scan(`const { t } = useTranslation('common'); t('a.b'); t("c")`)).toEqual({
    file: 'x.tsx',
    namespaces: ['common'],
    keys: ['a.b', 'c'],
    dynamicPatterns: [],
    unattributed: false,
  })
})

it('ignores t() and hook mentions inside comments', () => {
  // The fixture depends on this: useAppTranslation.ts documents itself with a
  // `t(` in prose and is still expected to be unattributed: false.
  const scanned = scan(
    `// this file has no t('ghost') call and no useTranslation\nexport const x = 1`,
  )
  expect(scanned).toEqual({
    file: 'x.tsx',
    namespaces: [],
    keys: [],
    dynamicPatterns: [],
    unattributed: false,
  })
})

it('does not mistake a // inside a string for a comment', () => {
  expect(scan(`const u = 'http://x'; const { t } = useTranslation('ns'); t('k')`).keys).toEqual([
    'k',
  ])
})

it('rejects identifiers that merely end in t', () => {
  expect(scan(`assert(1); format('nope'); const { t } = useTranslation('ns')`).keys).toEqual([])
})

it('treats t as a prop with no binding as unattributed', () => {
  expect(scan(`export const C = ({ t }) => t('price.label')`)).toEqual({
    file: 'x.tsx',
    namespaces: [],
    keys: ['price.label'],
    dynamicPatterns: [],
    unattributed: true,
  })
})

it('turns an interpolated template into a fog pattern, never a key', () => {
  const scanned = scan("const { t } = useTranslation('ns'); t(`errors.${code}`)")
  expect(scanned.keys).toEqual([])
  expect(scanned.dynamicPatterns).toEqual(['errors.*'])
})

it('fogs the whole namespace when the template has no literal head', () => {
  expect(scan("const { t } = useTranslation('ns'); t(`${a}.b`)").dynamicPatterns).toEqual(['*'])
})

it('treats a template with no interpolation as an ordinary key', () => {
  const scanned = scan("const { t } = useTranslation('ns'); t(`title`)")
  expect(scanned.keys).toEqual(['title'])
  expect(scanned.dynamicPatterns).toEqual([])
})

it('fogs rather than ignores an argument it cannot read', () => {
  // Ignoring it would leave the keys it reaches unclaimed, and unclaimed means
  // reported dead — the false positive Constitution rule 2 forbids.
  const scanned = scan(`const { t } = useTranslation('ns'); t(key); t('a' + b)`)
  expect(scanned.keys).toEqual([])
  expect(scanned.dynamicPatterns).toEqual(['*'])
})

it('keeps the second argument out of the key list', () => {
  expect(scan(`const { t } = useTranslation('ns'); t('greeting', { name: 'Ada' })`).keys).toEqual([
    'greeting',
  ])
})

it('binds nothing when the namespace is not a literal', () => {
  const scanned = scan(`const { t } = useTranslation(ns); t('k')`)
  expect(scanned.namespaces).toEqual([])
  expect(scanned.unattributed).toBe(true)
})

it('binds nothing for the array form, which v1 does not target', () => {
  const scanned = scan(`const { t } = useTranslation(['a', 'b']); t('k')`)
  expect(scanned.namespaces).toEqual([])
  expect(scanned.unattributed).toBe(true)
})

it('only honours hooks it was configured with', () => {
  const source = `const { t } = useAppTranslation('admin'); t('k')`
  expect(scan(source).namespaces).toEqual([])
  expect(scan(source, ['useTranslation', 'useAppTranslation']).namespaces).toEqual(['admin'])
})

it('collects several bindings in source order and de-duplicates', () => {
  expect(
    scan(`useTranslation('common'); useTranslation('checkout'); useTranslation('common'); t('k')`)
      .namespaces,
  ).toEqual(['common', 'checkout'])
})
