# i18n-xray — CLAUDE.md

X-ray for your i18n: a CLI that statically analyzes how a React codebase uses i18next-style translations, plus a self-contained HTML visual report. Vlad owns architecture, seams, and scope; Claude Code implements within them. When anything is ambiguous, stop and ask — do not invent scope.

## Roles

- Vlad: architecture, seam purity, scope decisions, gate verification, all `git commit` / PR approval.
- Claude Code: implementation of the current stage in PLAN.md, tests first where the spec allows.

## Constitution (non-negotiable)

1. **Never guess.** Dynamic keys (`` t(`errors.${x}`) ``) produce "fog" over the matched subtree (`errors.*`) — never concrete findings. `t()` calls in a file with no hook binding (e.g. `t` received as a prop) go to an `unattributed` bucket that fogs conservatively. Coarse but never wrong.
2. **Over-attribute usage.** A file binding multiple namespaces marks every key it uses as alive in *all* of them. False negatives (a dead key survives) are acceptable. False positives (a live key flagged dead) are bugs — they cause strings to be deleted from production. Zero tolerance.
3. **Warn on suspicious silence.** If the scanner finds `t()` calls but zero hook bindings repo-wide, the configured hook name is probably wrong (wrapper hooks exist). Emit a loud warning and a non-zero exit under `--fail-on`. Never report a clean bill of health from an empty scan.
4. **Seams.** `packages/core` is pure: no fs, no globs, no process, no framework imports; it may import only from `contracts`. All dependency arrows point inward to `core`. Loaders and scanners are adapters. `report.json` (Zod schema in `contracts`) is the ONLY interface between analyzer and viewer.
5. **Scope discipline.** v1 targets exactly one convention: i18next JSON namespaces + `const t = useTranslation('ns')` / `t('key')`. Regex-level scanning only. No AST, no bundler integration, no ESLint plugin, no multi-format loaders.
6. **Do not implement anything from the Roadmap section of PLAN.md.** Do not add features, flags, packages, or abstractions not named in the current stage. If a stage seems to require something unlisted, stop and ask.
7. **One stage per session, one PR per stage.** Work only on the stage Vlad names in the prompt. Stop at the stage's gate and present evidence (test output, CI link, generated artifacts). Never start the next stage unprompted.

## Monorepo layout

```
packages/
  core/        pure domain: types + analysis functions (data in, findings out)
  contracts/   Zod schemas: report.json, FileScan, module-graph port (interface only)
  loader/      i18next JSON loader: globs locale files, flattens nested keys
  scanner/     per-file regex extraction: bindings, key literals, fog patterns
  viewer/      report.json -> single self-contained HTML (treemap)
  cli/         wiring, flags, exit codes; the ONLY published package
fixtures/
  basic-app/   fake React app + locales; the executable spec (see PLAN.md Stage 1)
```

## Tooling & conventions

- pnpm workspaces + Turborepo. TypeScript strict everywhere. ESM only.
- Node engines: `>=20`. License: MIT.
- Tests: Vitest. Every core function unit-tested; loader+scanner+core covered by the fixture integration test.
- Build: tsup. Internal packages are `"private": true`; `cli` bundles them at build time and is published as `i18n-xray` with `bin: { "i18n-xray": ... }`.
- CI: GitHub Actions — lint + test + build on every PR; `npm publish --provenance` on tag push (wired in Stage 7, not before).
- No new runtime dependencies without asking. Current allowlist: `zod`, `commander` (or `cac`), `fast-glob`, `picocolors`, `tsup`, `vitest`.

## Data model (authoritative)

```ts
type KeyId = string            // "ns:a.b.c" — namespace-prefixed, flattened
type Finding =
  | { kind: 'dead-key';        key: KeyId; locales: string[] }
  | { kind: 'value-duplicate'; value: string; keys: KeyId[]; locale: string }  // same text in >1 namespace — headline finding; same-namespace repeats are NOT findings (A2)
  | { kind: 'locale-gap';      key: KeyId; presentIn: string[]; missingIn: string[] }
  | { kind: 'convention';      file: string; namespaces: string[] }            // binds > maxNamespacesPerFile

type FileScan = {
  file: string
  namespaces: string[]         // from useTranslation('...') string literals
  keys: string[]               // from t('...') string literals (un-prefixed)
  dynamicPatterns: string[]    // e.g. "errors.*" derived from template literals
  unattributed: boolean        // t() present without binding, or t received as prop
}
```

Attribution rule: every key in `FileScan.keys` counts as used in every namespace in `FileScan.namespaces`. Dynamic patterns fog their matching subtree within the file's bound namespaces. `unattributed: true` widens the file's namespace set to ALL namespaces: its keys and dynamic patterns attribute repo-wide. Keys the file never mentions are unaffected. (Widening can only keep keys alive, never kill — decision A1(b), fixtures/basic-app/EXPECTED.md §A1.)

## CLI contract (target shape, built in Stage 4)

```
i18n-xray scan [srcDir] [localesDir]
  --hook <names...>              hook name(s) binding t (default: useTranslation)
  --locales-pattern <pattern>    default: "{locale}/{ns}.json" relative to localesDir
  --max-namespaces-per-file <n>  convention check threshold (default: 1)
  --json <path>                  write report.json
  --fail-on <kinds...>           exit 1 if any listed finding kind present
i18n-xray report <report.json> -o <report.html>
```

## Definition of done for any stage

- The stage's gate in PLAN.md passes with evidence shown.
- `pnpm test`, `pnpm build`, `pnpm lint` green locally and in CI.
- No seam violations (`core` imports checked), no unlisted dependencies, no roadmap features.
