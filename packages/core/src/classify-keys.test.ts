/**
 * The partition behind the report summary, checked against EXPECTED.md §H.
 * §H records `KeyIds alive only via fog or unattributed widening` as 6 (default)
 * and 4 (wrapper); those are exactly `fogAlive + wideningAlive` here.
 */
import { expect, it } from 'vitest'
import { SCANS_DEFAULT_RUN, SCANS_WRAPPER_RUN, SOURCES } from './expected-md.data'
import { classifyKeys, findDeadKeys, flattenLocales } from './index'

const catalog = flattenLocales(SOURCES)
const defaultRun = classifyKeys(catalog, SCANS_DEFAULT_RUN)
const wrapperRun = classifyKeys(catalog, SCANS_WRAPPER_RUN)

it('§H default run — 7 verified / 2 fog / 4 widening / 1 dead of 14', () => {
  expect({
    total: defaultRun.total,
    verified: defaultRun.verified.length,
    fogAlive: defaultRun.fogAlive.length,
    wideningAlive: defaultRun.wideningAlive.length,
    dead: defaultRun.dead.length,
  }).toEqual({ total: 14, verified: 7, fogAlive: 2, wideningAlive: 4, dead: 1 })
})

it('§H wrapper run — 8 verified / 2 fog / 2 widening / 2 dead of 14', () => {
  expect({
    total: wrapperRun.total,
    verified: wrapperRun.verified.length,
    fogAlive: wrapperRun.fogAlive.length,
    wideningAlive: wrapperRun.wideningAlive.length,
    dead: wrapperRun.dead.length,
  }).toEqual({ total: 14, verified: 8, fogAlive: 2, wideningAlive: 2, dead: 2 })
})

it('§H — fogAlive + wideningAlive reproduces the "alive only via fog or widening" row', () => {
  expect(defaultRun.fogAlive.length + defaultRun.wideningAlive.length).toBe(6)
  expect(wrapperRun.fogAlive.length + wrapperRun.wideningAlive.length).toBe(4)
})

it.each([
  ['default run', defaultRun],
  ['wrapper run', wrapperRun],
])('%s — the four buckets partition every declared key exactly once', (_label, classified) => {
  const buckets = [
    ...classified.verified,
    ...classified.fogAlive,
    ...classified.wideningAlive,
    ...classified.dead,
  ]
  expect(buckets).toHaveLength(classified.total)
  expect(new Set(buckets).size).toBe(classified.total)
})

it.each([
  ['default run', defaultRun, SCANS_DEFAULT_RUN],
  ['wrapper run', wrapperRun, SCANS_WRAPPER_RUN],
])('%s — the dead bucket is exactly findDeadKeys output', (_label, classified, scans) => {
  const dead = findDeadKeys(catalog, scans)
    .filter((finding) => finding.kind === 'dead-key')
    .map((finding) => finding.key)
  expect([...classified.dead].sort()).toEqual([...dead].sort())
})

it('names the fogged and widened keys, so the partition is auditable', () => {
  expect(defaultRun.fogAlive).toEqual(['checkout:errors.declined', 'checkout:errors.expired'])
  expect(defaultRun.wideningAlive).toEqual([
    'admin:panel.heading',
    'admin:price.label',
    'checkout:price.label',
    'common:panel.heading',
  ])
})
