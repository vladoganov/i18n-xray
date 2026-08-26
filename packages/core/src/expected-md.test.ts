/**
 * One test per row of `fixtures/basic-app/EXPECTED.md`, named by its row id.
 * Expected values are transcribed from that table, never re-derived here — if a
 * test and the table disagree, the table wins and the disagreement is a bug
 * report, not something to reconcile in code.
 */
import { describe, expect, it } from 'vitest'
import {
  MAX_NAMESPACES_PER_FILE,
  SCANS_DEFAULT_RUN,
  SCANS_WRAPPER_RUN,
  SOURCES,
} from './expected-md.data'
import {
  checkConventions,
  findDeadKeys,
  findLocaleGaps,
  findValueDuplicates,
  flattenLocales,
} from './index'
import type { Finding, KeyId } from './types'

const catalog = flattenLocales(SOURCES)

const deadDefaultRun = findDeadKeys(catalog, SCANS_DEFAULT_RUN)
const deadWrapperRun = findDeadKeys(catalog, SCANS_WRAPPER_RUN)
const duplicates = findValueDuplicates(catalog)
const gaps = findLocaleGaps(catalog)
const conventions = checkConventions(SCANS_DEFAULT_RUN, MAX_NAMESPACES_PER_FILE)

const findingsDefaultRun = [...deadDefaultRun, ...duplicates, ...gaps, ...conventions]
const findingsWrapperRun = [...deadWrapperRun, ...duplicates, ...gaps, ...conventions]

const deadKeyIds = (findings: Finding[]): KeyId[] =>
  findings.filter((finding) => finding.kind === 'dead-key').map((finding) => finding.key)

/** Every KeyId a finding refers to, whatever the finding's kind. */
const referencedKeyIds = (findings: Finding[]): KeyId[] =>
  findings.flatMap((finding) => {
    if (finding.kind === 'dead-key') return [finding.key]
    if (finding.kind === 'locale-gap') return [finding.key]
    if (finding.kind === 'value-duplicate') return finding.keys
    return []
  })

const declaredKeyIds = new Set(Object.values(catalog).flatMap((messages) => Object.keys(messages)))

describe('D — expected findings, default run', () => {
  it('D1 — dead-key: common:legacy.tooltip, declared in [en, pl]', () => {
    expect(deadDefaultRun).toContainEqual({
      kind: 'dead-key',
      key: 'common:legacy.tooltip',
      locales: ['en', 'pl'],
    })
  })

  it('D2 — value-duplicate: "Cancel" across common + checkout, locale en', () => {
    expect(duplicates).toEqual([
      {
        kind: 'value-duplicate',
        value: 'Cancel',
        keys: ['checkout:buttons.cancel', 'common:actions.cancel'],
        locale: 'en',
      },
    ])
  })

  it('D3 — locale-gap: common:beta.badge present in [en], missing in [pl]', () => {
    expect(gaps).toContainEqual({
      kind: 'locale-gap',
      key: 'common:beta.badge',
      presentIn: ['en'],
      missingIn: ['pl'],
    })
  })

  it('D4 — convention: src/CheckoutSummary.tsx binds [common, checkout]', () => {
    expect(conventions).toContainEqual({
      kind: 'convention',
      file: 'src/CheckoutSummary.tsx',
      namespaces: ['common', 'checkout'],
    })
  })

  it('D — the complete default-run list is exactly these four findings', () => {
    expect(findingsDefaultRun).toHaveLength(4)
  })
})

describe('E — expected findings, wrapper run', () => {
  it('E9 — dead-key: common:panel.heading, declared in [en, pl]', () => {
    expect(deadWrapperRun).toContainEqual({
      kind: 'dead-key',
      key: 'common:panel.heading',
      locales: ['en', 'pl'],
    })
  })

  it('E — exactly five findings, and no D finding disappears', () => {
    expect(findingsWrapperRun).toHaveLength(5)
    for (const finding of findingsDefaultRun) expect(findingsWrapperRun).toContainEqual(finding)
  })
})

describe('F — explicit non-findings', () => {
  it('F5 — common:title is not dead (over-attributed from a two-namespace file)', () => {
    expect(deadKeyIds(deadDefaultRun)).not.toContain('common:title')
  })

  it('F6 — checkout:title is not dead (same over-attribution, other half)', () => {
    expect(deadKeyIds(deadDefaultRun)).not.toContain('checkout:title')
  })

  it('F7 — checkout:errors.declined is not dead (fogged by errors.*)', () => {
    expect(deadKeyIds(deadDefaultRun)).not.toContain('checkout:errors.declined')
  })

  it('F8 — checkout:errors.expired is not dead (fogged by errors.*)', () => {
    expect(deadKeyIds(deadDefaultRun)).not.toContain('checkout:errors.expired')
  })

  it('F10 — checkout:price.label is not dead (fogged by the unattributed file)', () => {
    expect(deadKeyIds(deadDefaultRun)).not.toContain('checkout:price.label')
  })

  it('F11 — admin:price.label is not dead (accepted false negative)', () => {
    expect(deadKeyIds(deadDefaultRun)).not.toContain('admin:price.label')
  })

  it('F12 — admin:panel.heading is not dead in either run', () => {
    expect(deadKeyIds(deadDefaultRun)).not.toContain('admin:panel.heading')
    expect(deadKeyIds(deadWrapperRun)).not.toContain('admin:panel.heading')
  })

  it('F13 — errors.* fogs only checkout, so no errors key is named under common or admin', () => {
    for (const keyId of [
      'common:errors.declined',
      'common:errors.expired',
      'admin:errors.declined',
      'admin:errors.expired',
    ]) {
      expect(declaredKeyIds.has(keyId)).toBe(false)
      expect(deadKeyIds(deadDefaultRun)).not.toContain(keyId)
    }
  })

  it('F14 — no value-duplicate in pl', () => {
    expect(
      duplicates.filter((finding) => finding.kind === 'value-duplicate' && finding.locale === 'pl'),
    ).toEqual([])
  })

  it('F15 — no second locale-gap', () => {
    expect(gaps).toHaveLength(1)
  })

  it('F16 — no convention finding for any file but src/CheckoutSummary.tsx', () => {
    expect(
      conventions.map((finding) => (finding.kind === 'convention' ? finding.file : '')),
    ).toEqual(['src/CheckoutSummary.tsx'])
  })

  it('F17 — no concrete finding is derived from the errors.${code} pattern', () => {
    for (const keyId of referencedKeyIds(findingsWrapperRun)) {
      expect(keyId.startsWith('checkout:errors.')).toBe(false)
      // Nothing may be invented: every reported KeyId is one the locales declare.
      expect(declaredKeyIds.has(keyId)).toBe(true)
    }
  })

  it('F18 — no silence warning in either run: bindings exist repo-wide in both', () => {
    // §G's rule is "t() calls but ZERO bindings repo-wide". Emitting the warning
    // is Stage 4's job (PLAN.md), so this asserts the precondition the table
    // states about the fixture, not the warning itself.
    for (const scans of [SCANS_DEFAULT_RUN, SCANS_WRAPPER_RUN]) {
      expect(scans.filter((scan) => scan.namespaces.length > 0).length).toBeGreaterThan(0)
    }
  })
})
