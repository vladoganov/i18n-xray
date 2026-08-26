/**
 * Blank out comments while leaving string and template literals intact.
 *
 * This is not cosmetic. `fixtures/basic-app/src/useAppTranslation.ts` documents
 * itself with "the file contains no `t(` call at all" — a naive scanner reads
 * that comment as a real call and marks the file `unattributed`, contradicting
 * EXPECTED.md §C1. Prose about `t()` is exactly what an i18n codebase is full of.
 *
 * The alternation order matters: string and template literals are matched
 * first, so a `//` inside "http://example.com" is never taken for a comment.
 * Regex literals are not tracked — a known limit of regex-level scanning.
 */
const LITERAL_OR_COMMENT =
  /("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(`(?:[^`\\]|\\.)*`)|(\/\/[^\n]*)|(\/\*[\s\S]*?\*\/)/g

export function stripComments(source: string): string {
  return source.replace(LITERAL_OR_COMMENT, (matched, double, single, template) =>
    double === undefined && single === undefined && template === undefined ? ' ' : matched,
  )
}
