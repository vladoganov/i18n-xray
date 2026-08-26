/**
 * Compiles a locales pattern such as `{locale}/{ns}.json` into the two things a
 * loader needs: a glob to find candidate files, and a regex that reads the
 * locale and namespace back out of each matched path.
 */

const PLACEHOLDER = /\{(locale|ns)\}/g

export type CompiledLocalesPattern = {
  /** Glob relative to the locales directory. */
  glob: string
  /** Named-group regex over a matched relative path: `locale` and `ns`. */
  match: RegExp
}

export function compileLocalesPattern(pattern: string): CompiledLocalesPattern {
  let glob = ''
  let source = '^'
  let consumed = 0
  const seen = new Set<string>()

  for (const placeholder of pattern.matchAll(PLACEHOLDER)) {
    const name = placeholder[1]
    if (name === undefined) continue
    if (seen.has(name)) {
      throw new Error(`Locales pattern repeats {${name}}: ${pattern}`)
    }
    seen.add(name)

    const literal = pattern.slice(consumed, placeholder.index)
    glob += `${literal}*`
    source += `${escapeRegExp(literal)}(?<${name}>[^/]+)`
    consumed = placeholder.index + placeholder[0].length
  }

  const tail = pattern.slice(consumed)
  glob += tail
  source += `${escapeRegExp(tail)}$`

  for (const required of ['locale', 'ns']) {
    if (!seen.has(required)) {
      throw new Error(`Locales pattern must contain {${required}}: ${pattern}`)
    }
  }

  return { glob, match: new RegExp(source) }
}

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
