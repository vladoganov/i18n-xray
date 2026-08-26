import type { FileScan } from '@i18n-xray/core'
import { stripComments } from './strip-comments'

export const DEFAULT_HOOKS = ['useTranslation']

export type ScanOptions = {
  /** Hook names that bind `t`. Defaults to `useTranslation`. */
  hooks?: string[]
}

/** Sticky matchers for the first argument of a call, positioned after `(`. */
const SINGLE_QUOTED = /\s*'((?:[^'\\\n]|\\.)*)'\s*[,)]/y
const DOUBLE_QUOTED = /\s*"((?:[^"\\\n]|\\.)*)"\s*[,)]/y
const TEMPLATE = /\s*`((?:[^`\\]|\\.)*)`\s*[,)]/y

/** A `t(` call. The lookbehind rejects `assert(`, `format(`, `useTranslation(`. */
const T_CALL = /(?<![$\w])t\s*\(/g

/**
 * Extract one `FileScan` from one file's text. Pure: text in, data out.
 *
 * Three shapes of `t()` argument are recognised, and the third is the one that
 * keeps the tool honest:
 *
 *   t('a.b')            -> a key
 *   t(`a.${x}`)         -> the fog pattern `a.*`, never a concrete key
 *   t(anything else)    -> the fog pattern `*`
 *
 * That last case matters. Silently ignoring an argument we cannot read would
 * leave the keys it reaches unclaimed, and unclaimed means reported dead — a
 * false positive, which Constitution rule 2 does not tolerate. Fogging the
 * whole bound namespace is coarse, and correct.
 */
export function scanSource(file: string, source: string, options: ScanOptions = {}): FileScan {
  const hooks = options.hooks ?? DEFAULT_HOOKS
  const code = stripComments(source)

  // Cheap prefilter (PLAN.md Stage 3): a file naming no configured hook and
  // making no `t(` call cannot contribute anything, so skip the work.
  T_CALL.lastIndex = 0
  if (!hooks.some((hook) => code.includes(hook)) && !T_CALL.test(code)) {
    return { file, namespaces: [], keys: [], dynamicPatterns: [], unattributed: false }
  }

  const namespaces = unique(bindings(code, hooks))
  const keys: string[] = []
  const dynamicPatterns: string[] = []
  let calls = 0

  T_CALL.lastIndex = 0
  for (let call = T_CALL.exec(code); call !== null; call = T_CALL.exec(code)) {
    calls += 1
    const argument = firstArgument(code, T_CALL.lastIndex)

    if (argument === undefined) dynamicPatterns.push('*')
    else if (argument.kind === 'string') keys.push(argument.value)
    else if (!argument.value.includes('${')) keys.push(argument.value)
    else dynamicPatterns.push(`${argument.value.slice(0, argument.value.indexOf('${'))}*`)
  }

  return {
    file,
    namespaces,
    keys: unique(keys),
    dynamicPatterns: unique(dynamicPatterns),
    unattributed: calls > 0 && namespaces.length === 0,
  }
}

/**
 * Namespaces bound by a configured hook, in source order. A non-literal
 * argument — `useTranslation(ns)`, or the array form `useTranslation(['a'])`,
 * which v1 does not target — yields no binding at all. That is the safe
 * failure: the file falls into the `unattributed` bucket and fogs.
 */
function bindings(code: string, hooks: string[]): string[] {
  if (hooks.length === 0) return []
  const alternation = hooks.map(escapeRegExp).join('|')
  const hookCall = new RegExp(`(?<![$\\w])(?:${alternation})\\s*\\(`, 'g')

  const namespaces: string[] = []
  for (let call = hookCall.exec(code); call !== null; call = hookCall.exec(code)) {
    const argument = firstArgument(code, hookCall.lastIndex)
    if (argument?.kind === 'string') namespaces.push(argument.value)
  }
  return namespaces
}

type Argument = { kind: 'string' | 'template'; value: string }

/** Read a call's first argument, given the index just past its `(`. */
function firstArgument(code: string, from: number): Argument | undefined {
  for (const [matcher, kind] of [
    [SINGLE_QUOTED, 'string'],
    [DOUBLE_QUOTED, 'string'],
    [TEMPLATE, 'template'],
  ] as const) {
    matcher.lastIndex = from
    const found = matcher.exec(code)
    if (found?.[1] !== undefined) return { kind, value: found[1] }
  }
  return undefined
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
