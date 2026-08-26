# i18n-xray — PLAN.md

Staged backlog. One stage per session, one PR per stage. Each stage ends with a verification gate; the next stage does not start until the gate passes and Vlad approves. The Constitution in CLAUDE.md applies to every stage.

Decisions locked: name `i18n-xray` · MIT · Node >=20 · default locale layout `locales/{locale}/{ns}.json`, overridable via `--locales-pattern`.

## Stage 0 — Scaffold

- pnpm + Turborepo monorepo with empty-but-wired packages per CLAUDE.md layout.
- TypeScript strict, ESM, shared tsconfig base. Vitest configured with one trivial passing test per package.
- GitHub Actions: lint + test + build on PR and on main.
- Root README stub: one-paragraph description + "in active development".
- **Gate:** `pnpm lint`, `pnpm test`, `pnpm build` green locally and in CI on the PR.

## Stage 1 — Fixture repo (the executable spec)

Create `fixtures/basic-app/`: a fake React app (`src/`) + locale files (`locales/en/…`, `locales/pl/…`) planting every scanner decision. Each case marked with a comment naming its expected finding. Required cases:

1. Dead key: declared in a namespace, referenced nowhere.
2. Value duplicate: identical text value under different keys in two namespaces (same locale).
3. Locale gap: key present in `en`, missing in `pl`.
4. Over-attribution: one file binds two namespaces and calls `t('title')` — the key must count alive in BOTH; a `title` key in either namespace must NOT be dead.
5. Fog: `` t(`errors.${code}`) `` — every `errors.*` key in the file's namespaces must NOT be flagged dead, and the pattern must appear in `dynamicPatterns`.
6. Unattributed: a helper component receiving `t` as a prop and calling it — file marked `unattributed`, keys fog conservatively.
7. Wrapper hook: one file using `useAppTranslation('ns')` — invisible under default `--hook`, visible with `--hook useAppTranslation`; used later to verify the silence warning.
8. Convention breach: a file binding two namespaces (can reuse case 4) — must yield a `convention` finding at default `--max-namespaces-per-file 1`.

- Write `fixtures/basic-app/EXPECTED.md`: a table of every planted case → exact expected finding or explicit non-finding. This table is the acceptance spec for Stages 2–4.
- **Gate:** Vlad reviews EXPECTED.md and confirms every row matches the Constitution's rules before any analysis code is written.

## Stage 2 — Core analysis (pure functions)

- In `core`: `flattenLocales`, `findValueDuplicates`, `findDeadKeys`, `findLocaleGaps`, `checkConventions`. Plain data in, `Finding[]` out. No I/O.
- Unit tests mirroring every EXPECTED.md row with hand-built inputs, plus invariants: a key matched by any dynamic pattern is never dead; a key referenced anywhere is never dead; a key in a multi-namespace file is alive in all bound namespaces.
- **Gate:** every EXPECTED.md row has a corresponding unit test; `core`'s package.json has zero runtime deps except `contracts`; import check confirms no fs/path/glob usage.

## Stage 3 — Loader + scanner (adapters)

- `loader`: glob `localesDir` using the locales pattern (default `{locale}/{ns}.json`), flatten nested JSON to `KeyId`s.
- `scanner`: per-file regex extraction into `FileScan` — hook bindings (configurable names), `t('...')` literals, template-literal fog patterns, unattributed detection (`t(` calls with zero bindings in file).
- Integration test: loader + scanner + core against `fixtures/basic-app`; assert the complete findings list equals EXPECTED.md exactly (no extra, no missing).
- **Gate:** integration test green; then deliberately break one fixture case (e.g. reference the dead key) and confirm the test fails — mutation sanity check — then revert.

## Stage 4 — CLI + report.json

- `i18n-xray scan` per the CLI contract in CLAUDE.md. Emits `report.json` validated against the `contracts` Zod schema (findings + FileScans + summary: totals, fog %, unattributed %).
- Silence warning per Constitution rule 3, including non-zero exit when `--fail-on` covers it.
- Exit codes: 0 clean, 1 when `--fail-on` kinds present or on silence warning under fail mode, 2 on usage/config errors.
- **Gate:** snapshot test of `report.json` on the fixture; schema validation inside the test; exit codes asserted for pass, fail-on, and silence cases; `pnpm --filter cli build` produces a runnable `npx` binary tested against the fixture.

## Stage 5 — Viewer

- `i18n-xray report report.json -o report.html`: ONE self-contained HTML file — inline CSS/JS, zero network requests (must open from a Slack download offline).
- Treemap: namespaces sized by key count, colored by health (dead %, value-duplicate involvement). Click namespace → finding list with file/key locations. Header: totals, fog %, unattributed %.
- **Gate:** generated HTML opens from `file://` with network disabled and renders the fixture report; Vlad does a manual visual review.

## Stage 6 — Real-world run: production-codebase protocol (run by Vlad locally)

The usefulness gate. Output contains proprietary strings — the report, HTML, and run log never enter this repo or leave the company machine.

1. Smoke: run against the target production frontend; must complete; wall time budget < 60s.
2. Sanity metrics: total keys, namespaces, fog %, unattributed %. If fog + unattributed > ~50%, scanner patterns miss real conventions — file issues in this repo (patterns only, no proprietary strings), extend, rerun. This is the expected first outcome.
3. False-positive audit: sample 20 random `dead-key` findings, verify each manually. Target: 0 false positives. Any false positive = stop-the-line bug in attribution/fog logic.
4. Value-duplicate spot check: sample 10 clusters; confirm they are real consolidation candidates.
5. Wrapper-hook check: run with default hook first — silence warning must fire; rerun with `--hook <the codebase's wrapper>` — findings must appear.
- **Gate:** private run log (numbers + audit outcomes) kept locally; generalized findings converted to GitHub issues.

## Stage 7 — Ship

- README: origin story → prior art (`i18n-doctor`, `i18n-unused`; extraction tools like `i18next-parser`/`i18next-scanner` as a different category) → why this exists anyway (learning + the structural/visual layer) → quickstart (`npx i18n-xray scan`) → findings reference → roadmap incl. the component-tree mockup.
- Publish pipeline: tag push → CI → test + build → `npm publish --provenance` of the `i18n-xray` package (replacing the 0.0.1 placeholder).
- **Gate:** from a clean machine/container: `npx i18n-xray scan` works against the fixture; npm page renders correctly; provenance badge visible.

## Roadmap (do NOT implement — README content only)

1. Near-duplicate detection (fuzzy, then AI-assisted semantic matching)
2. Module-graph port + webpack `stats.json` adapter → zombie-usage findings (keys referenced only from unreachable code)
3. Per-component tree view: components with bound namespace + keys; cross-namespace binding rendered as a smell; `maxNamespacesPerFile` as enforced convention
4. Route → namespace manifest (fixes fetch-all namespace loading)
5. ESLint plugin: local rules (unknown key, foreign-namespace usage) over the same core
6. AST scanner (ts-morph): resolve statically-computable dynamic keys via TypeScript union types
