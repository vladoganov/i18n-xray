/**
 * `flattenLocales` is the one core function with no EXPECTED.md row of its own,
 * so it gets a direct unit test per CLAUDE.md's "every core function
 * unit-tested" rule.
 */
import { expect, it } from 'vitest'
import { flattenLocales } from './index'

it('prefixes each flattened path with its namespace', () => {
  expect(flattenLocales({ en: { common: { cta: { save: 'Save' } } } })).toEqual({
    en: { 'common:cta.save': 'Save' },
  })
})

it('flattens arbitrarily deep nesting and keeps top-level leaves un-dotted', () => {
  expect(flattenLocales({ en: { ns: { title: 'T', a: { b: { c: 'deep' } } } } })).toEqual({
    en: { 'ns:title': 'T', 'ns:a.b.c': 'deep' },
  })
})

it('keeps locales and namespaces separate', () => {
  expect(
    flattenLocales({
      en: { common: { title: 'Acme Store' }, admin: { title: 'Admin' } },
      pl: { common: { title: 'Sklep Acme' }, admin: { title: 'Admin' } },
    }),
  ).toEqual({
    en: { 'common:title': 'Acme Store', 'admin:title': 'Admin' },
    pl: { 'common:title': 'Sklep Acme', 'admin:title': 'Admin' },
  })
})

it('yields no keys for an empty namespace', () => {
  expect(flattenLocales({ en: { empty: {} } })).toEqual({ en: {} })
})
