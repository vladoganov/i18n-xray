# i18n-xray

X-ray for your i18n. See how your React app actually uses translations.

[![npm version](https://img.shields.io/npm/v/i18n-xray.svg)](https://www.npmjs.com/package/i18n-xray)
[![CI](https://github.com/vladoganov/i18n-xray/actions/workflows/ci.yml/badge.svg)](https://github.com/vladoganov/i18n-xray/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## What it does

i18n-xray reads your locale JSON and your source files, then reports how the two line up. It is two
commands.

`scan` does the analysis and prints a summary. With `--json` it also writes a `report.json`.

`report` turns that `report.json` into one self-contained HTML file. Inline CSS and JavaScript, no
network requests. It opens from `file://` with networking disabled, so you can drop it in a chat
thread and people can actually read it.

### The four finding kinds

| Kind              | Meaning                                                                |
| ----------------- | ---------------------------------------------------------------------- |
| `dead-key`        | A key is declared in your locale files, and nothing references it.     |
| `value-duplicate` | The same text appears under different keys in more than one namespace. |
| `locale-gap`      | A key exists in some locales and is missing from others.               |
| `convention`      | One file binds more namespaces than your threshold allows.             |

`value-duplicate` is the one most tools do not report. It is the signal that two namespaces have
grown a copy of the same string, which is usually the start of them drifting apart.

### Example output

Running against the fixture app in this repo:

```console
$ npx i18n-xray scan ./src ./locales
Scanned 7 files, 14 keys across 3 namespaces and 2 locales.
Coverage: 7 verified, 2 fogged (14.3%), 4 unattributed (28.6%), 1 dead.
Files: 4 with bindings, 2 unattributed, 1 with dynamic keys.
Findings: 4
  dead-key: 1
  value-duplicate: 1
  locale-gap: 1
  convention: 1
```

The four findings behind that summary:

| Kind              | Finding                                                                               |
| ----------------- | ------------------------------------------------------------------------------------- |
| `dead-key`        | `common:legacy.tooltip`, declared in `en` and `pl`, referenced nowhere.               |
| `value-duplicate` | `"Cancel"` in `en`, under both `common:actions.cancel` and `checkout:buttons.cancel`. |
| `locale-gap`      | `common:beta.badge` is in `en`, missing from `pl`.                                    |
| `convention`      | `src/CheckoutSummary.tsx` binds two namespaces: `common` and `checkout`.              |

## Origin

This came out of maintaining i18n on a large production React codebase.

Two problems kept recurring. The same English string existed under several keys in several
namespaces, so a copy change fixed one and missed the others. And every namespace was fetched
upfront on load, regardless of what the current route needed, because nobody could say which
namespaces a page actually used.

Neither problem is a bug you can find by reading a diff. Both are structural, and both need a tool
that looks at the whole codebase at once.

## Prior art

There are good tools in this space already, and they overlap with this one.

[`i18n-doctor`](https://www.npmjs.com/package/i18n-doctor) and
[`i18n-unused`](https://www.npmjs.com/package/i18n-unused) both find unused and missing keys. If
that is all you need, use them. They are mature and they do the job.

Extraction tools like [`i18next-parser`](https://github.com/i18next/i18next-parser) and
[`i18next-scanner`](https://github.com/i18next/i18next-scanner) are a different category. They pull
keys out of source to generate catalogs. That is a build step, not an audit.

So why this exists anyway. Two honest reasons.

First, building the analysis from scratch was the point. This is a project about writing the
attribution logic, the seams, and the safety rules myself rather than configuring someone else's.

Second, it covers ground the others do not. Cross-namespace value duplication is the headline
finding here, and it is the one that maps directly to the real maintenance pain. The report also
records which namespaces each file binds, which is the raw material for a namespace-to-component
view. And the output is an offline HTML report you can share, not just a terminal dump.

## Trust model

A dead-key report is only useful if you can act on it. If the tool guesses, you cannot, because
deleting a key it guessed wrong about removes a string from production.

So it does not guess.

**Dynamic keys become fog.** When the tool sees `` t(`errors.${code}`) ``, it cannot know which key
that is. It does not pick one. It marks the whole `errors.*` subtree as fogged, and every key under
it is treated as in use. Coarse, and never wrong in the direction that costs you.

**`t` passed as a prop widens.** A component that receives `t` as a prop and calls it has no
namespace binding to read. Rather than assume a namespace, the tool credits those keys to every
namespace at once. It keeps more keys alive than strictly necessary. That is the intended trade.

**A dead key that survives is acceptable. A live key reported dead is a bug.** Missing a stale key
costs you nothing but a little clutter. The reverse costs you a broken string in production. The
second one is treated as zero tolerance.

**The report tells you how much it can vouch for.** Every key falls into exactly one bucket:
verified, fogged, unattributed, or dead. The summary states fog percentage and unattributed
percentage, so you can see the blind spots instead of inferring them. On the fixture app that reads
14.3% fogged and 28.6% unattributed, so 42.9% of keys cannot be judged. That number is part of the
output on purpose.

**A scan that finds nothing is not a clean bill of health.** If the tool finds `t()` calls but no
hook bindings at all, your hook name is probably wrong. Many codebases wrap `useTranslation` in
their own hook. In that case it prints a loud warning, and under `--fail-on` it exits non-zero. It
will not hand you a quiet, empty, reassuring report.

## Quickstart

```console
npx i18n-xray scan ./src ./locales
```

To get the HTML report, write the JSON first, then render it:

```console
npx i18n-xray scan ./src ./locales --json report.json
npx i18n-xray report report.json -o report.html
```

Open `report.html` in a browser. It needs no server and no network.

### Flags

| Flag                            | Default              | Purpose                                                   |
| ------------------------------- | -------------------- | --------------------------------------------------------- |
| `--hook <names...>`             | `useTranslation`     | Hook names that bind `t`. Pass your wrapper hook here.    |
| `--locales-pattern <pattern>`   | `{locale}/{ns}.json` | Layout of your locale files inside the locales directory. |
| `--max-namespaces-per-file <n>` | `1`                  | Threshold for the `convention` finding.                   |
| `--json <path>`                 | none                 | Write `report.json` to this path.                         |
| `--fail-on <kinds...>`          | none                 | Exit 1 if any listed finding kind is present.             |

If your codebase wraps the i18next hook, name it:

```console
npx i18n-xray scan ./src ./locales --hook useTranslation useAppTranslation
```

### In CI

```yaml
- name: Check translations
  run: npx i18n-xray scan ./src ./locales --fail-on dead-key value-duplicate
```

Exit codes:

| Code | Meaning                                                                             |
| ---- | ----------------------------------------------------------------------------------- |
| `0`  | Clean, or findings exist but no `--fail-on` was given.                              |
| `1`  | A `--fail-on` kind is present, or the scan was silent while `--fail-on` was in use. |
| `2`  | Usage or configuration error. Bad flag, missing directory, malformed `report.json`. |

Note the second row. Under `--fail-on`, a suspiciously silent scan fails the build too. A wrong hook
name makes every finding kind come back empty, so gating that on a specific kind would disable the
check exactly when you need it.

## v1 scope

v1 targets one convention, deliberately.

* i18next JSON namespaces, loaded from a directory with a configurable layout.
* `const { t } = useTranslation('ns')` for the binding, and `t('key')` string literals for the keys.
* Regex-level scanning. No AST, no bundler integration, no type inference.
* One source root per run.

Anything outside that is classified as fog rather than guessed at. If a file binds through a
variable, or calls `t` with something the scanner cannot read, those keys widen or fog instead of
being silently dropped. You lose precision, you do not lose correctness.

## Roadmap

Not built yet. Listed so you can see where this is going.

1. **Near-duplicate detection.** Value duplication currently means byte-identical text. Fuzzy
   matching first, then semantic matching, to catch strings that differ by a comma.
2. **Component render-graph, and a per-component tree view.** Extract which component renders which
   from JSX, and build a graph of the app rather than a flat file list. Beyond drawing a tree, the
   render edges make findings sharper: a component that receives `t` as a prop can be attributed to
   the namespaces its actual renderers bind, instead of to every namespace, which shrinks the
   unattributed bucket without ever guessing.
3. **Route to namespace manifest.** Report which namespaces each route needs, so an app can stop
   fetching all of them upfront.
4. **Wrapper hook auto-discovery.** Follow imports from `react-i18next` to find wrapper hooks
   automatically, and retire `--hook` configuration.
5. **ESLint plugin.** The same analysis as local rules: unknown key, foreign-namespace usage.
6. **AST scanner.** Resolve statically-computable dynamic keys through TypeScript union types,
   turning some of today's fog into concrete findings.

## How it's built

A pnpm and Turborepo monorepo. `core` is pure domain logic: plain data in, findings out, with no
filesystem, globbing, or framework access, enforced by its TypeScript config. `loader` and `scanner`
are the adapters that touch disk. `contracts` holds the Zod schemas, and `report.json` is the only
interface between the analyzer and the viewer. `viewer` turns that JSON into HTML and imports
nothing else. `cli` wires it together and is the only published package.

`fixtures/basic-app` is a small fake React app that plants one case for every scanner decision, with
`fixtures/basic-app/EXPECTED.md` recording the exact expected finding, or explicit non-finding, for
each one. That table is the executable spec. Unit tests, the integration test, and the report
snapshot all check against it.

The project is built as a human-AI pair. The author owns the architecture, the spec, and every
verification gate. An implementation agent, Claude Code, works stage by stage under the constitution
in `CLAUDE.md`. The commit history shows the process.

## License

MIT. See [LICENSE](LICENSE).
