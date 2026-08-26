/**
 * The three invariants named in PLAN.md Stage 2. Unlike the row tests, these do
 * not read expected values from EXPECTED.md — they recompute attribution here,
 * independently and naively, and assert the property holds for every key the
 * fixture data declares. Each carries a coverage guard so it cannot pass by
 * checking nothing.
 */
import { describe, expect, it } from 'vitest'
import { SCANS_DEFAULT_RUN, SCANS_WRAPPER_RUN, SOURCES } from './expected-md.data'
import { findDeadKeys, flattenLocales } from './index'
import type { FileScan, KeyId } from './types'

const catalog = flattenLocales(SOURCES)
const declared = [...new Set(Object.values(catalog).flatMap((messages) => Object.keys(messages)))]
const allNamespaces = [...new Set(declared.map((keyId) => keyId.slice(0, keyId.indexOf(':'))))]

const runs: Array<[string, FileScan[]]> = [
  ['default run', SCANS_DEFAULT_RUN],
  ['wrapper run', SCANS_WRAPPER_RUN],
]

const deadKeyIdsFor = (scans: FileScan[]): Set<KeyId> =>
  new Set(
    findDeadKeys(catalog, scans)
      .filter((finding) => finding.kind === 'dead-key')
      .map((finding) => finding.key),
  )

/** `unattributed` widens to every namespace; otherwise a scan binds its own. */
const boundNamespaces = (scan: FileScan): string[] =>
  scan.unattributed ? allNamespaces : scan.namespaces

const literalHead = (pattern: string): string =>
  pattern.includes('*') ? pattern.slice(0, pattern.indexOf('*')) : pattern

describe.each(runs)('invariants — %s', (_label, scans) => {
  it('a key matched by any dynamic pattern is never dead', () => {
    const dead = deadKeyIdsFor(scans)
    let checked = 0

    for (const scan of scans) {
      for (const namespace of boundNamespaces(scan)) {
        for (const pattern of scan.dynamicPatterns) {
          const prefix = `${namespace}:${literalHead(pattern)}`
          for (const keyId of declared.filter((candidate) => candidate.startsWith(prefix))) {
            expect(dead.has(keyId)).toBe(false)
            checked += 1
          }
        }
      }
    }

    expect(checked).toBeGreaterThan(0)
  })

  it('a key referenced anywhere is never dead', () => {
    const dead = deadKeyIdsFor(scans)
    let checked = 0

    for (const scan of scans) {
      for (const namespace of boundNamespaces(scan)) {
        for (const key of scan.keys) {
          const keyId = `${namespace}:${key}`
          if (!declared.includes(keyId)) continue
          expect(dead.has(keyId)).toBe(false)
          checked += 1
        }
      }
    }

    expect(checked).toBeGreaterThan(0)
  })

  it('a key in a multi-namespace file is alive in all bound namespaces', () => {
    const dead = deadKeyIdsFor(scans)
    let checked = 0

    for (const scan of scans.filter((candidate) => candidate.namespaces.length > 1)) {
      for (const namespace of scan.namespaces) {
        for (const key of scan.keys) {
          const keyId = `${namespace}:${key}`
          if (!declared.includes(keyId)) continue
          expect(dead.has(keyId)).toBe(false)
          checked += 1
        }
      }
    }

    expect(checked).toBeGreaterThan(0)
  })
})
