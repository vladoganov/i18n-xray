# `fixtures/basic-app` — EXPECTED.md

The acceptance spec for Stages 2–4. Every planted case below maps to an **exact** expected finding
or an **explicit non-finding**. Stage 3's integration test asserts the complete findings list equals
this table — no extra, no missing.

Findings are treated as a **set**; this table does not specify ordering.

---

## A. Decisions this table encodes — ratified 2026-08-26

Three rules had to be pinned down to make the table computable: two derivations and one addition.
All three were reviewed and ratified — A1 as reading (b), A2 confirmed, A3 kept. A4 and A5 record
limits of the fixture rather than decisions. Stages 2–4 implement these as given; changing one means
changing this table first.

### A1. `unattributed: true` fogs the file's *keys* across all namespaces — not the whole world

CLAUDE.md says "`unattributed: true` fogs all namespaces (maximally conservative in v1)." That
admits two readings:

- **(a) Total fog** — an unattributed file anywhere suppresses dead-key detection for every key in
  every namespace.
- **(b) Namespace-set widening** — for that file, the namespace set is treated as *all* namespaces;
  its keys and its dynamic patterns attribute repo-wide instead of to a bound subset. Keys the file
  never mentions are unaffected.

**This table uses (b)**, and reading (a) is refuted by PLAN.md itself rather than by preference:
Stage 1 requires case 1 (a dead key) and case 6 (an unattributed file) to coexist in one fixture and
both to produce their stated outcomes. Under (a) no dead key can ever be reported once a single
unattributed file exists, so the required fixture would be impossible to build. Reading (b) is also
what case 6's own wording asks for — "**keys** fog conservatively", not "everything fogs".

Reading (b) is still strictly conservative: it can only keep keys alive, never mark a live key dead.

### A2. `value-duplicate` is cross-namespace only

CLAUDE.md: "same text in >1 namespace". Two keys sharing a value **within** one namespace are
therefore not a finding. The fixture does not lean on this — all values are unique per locale except
the single planted duplicate (verified) — so the rule is recorded rather than tested.

### A3. Row 9 (`common:panel.heading`) is an addition of mine

PLAN.md case 7 asks for a wrapper-hook file that is "invisible under default `--hook`, visible with
`--hook useAppTranslation`". As specified, that difference shows up only inside the FileScan — the
two runs produce an **identical** findings list, so the case cannot be verified from findings alone.

I added one stale key, `common:panel.heading`, to make the difference observable: the default run
keeps it alive by fog, the correctly configured run exposes it as dead. It also demonstrates the
direction of the error — fixing hook config finds *more* dead keys, it never resurrects one.

**Confirmed on review: row 9 stays.** Nothing else depends on it.

### A4. JSON cannot carry comments

Cases 1, 2 and 3 are planted entirely in locale JSON, where "mark each case with a comment" is
impossible — a `"_comment"` key would itself be scanned and reported dead. Their markers live in the
`.tsx` file that binds the owning namespace (`App.tsx` for all three) plus this table. Flagging in
case you want a different arrangement.

### A5. `useTranslation(someVariable)` alongside `t('key')` calls — known-uncovered, not an oversight

A file whose namespace arrives as a variable offers no string literal to bind, so if it also calls `t('key')` itself it falls under exactly the same rule as `t`-as-prop (case 6, `src/PriceLabel.tsx`): `namespaces: []`, `unattributed: true`, widening per the attribution rule in CLAUDE.md. Deliberately not a fixture case — `src/useAppTranslation.ts` is the non-literal half with no `t()` call of its own (hence `unattributed: false`, row C1), and no fixture file combines the two.

---

## B. Fixture inventory

### B1. Source files

| File | Role | Case |
| --- | --- | --- |
| `src/App.tsx` | Well-behaved baseline; one namespace, literal keys | markers for 1, 2, 3 |
| `src/CheckoutSummary.tsx` | Binds **two** namespaces, calls `t('title')` once | **4**, **8** |
| `src/CheckoutForm.tsx` | One namespace; passes `t` down as a prop | 2 (second half), 6 setup |
| `src/ErrorBanner.tsx` | `` t(`errors.${code}`) `` | **5** |
| `src/PriceLabel.tsx` | Receives `t` as a prop, no hook in file | **6** |
| `src/AdminPanel.tsx` | Uses `useAppTranslation('admin')` | **7** |
| `src/useAppTranslation.ts` | The wrapper itself; namespace is a variable | 7 setup |

### B2. Locale keys — `en` (14 keys) and `pl` (13 keys)

Liveness below is for the **default run**. `†` marks the one key whose liveness differs in the
wrapper run.

| KeyId | en | pl | Alive because | Case |
| --- | --- | --- | --- | --- |
| `common:title` | "Acme Store" | "Sklep Acme" | `t('title')` over-attributed from `CheckoutSummary.tsx` | 4 |
| `common:cta.save` | "Save" | "Zapisz" | literal in `App.tsx` | — |
| `common:actions.cancel` | "Cancel" | "Anuluj" | literal in `App.tsx` | 2 |
| `common:beta.badge` | "Beta" | *(missing)* | literal in `App.tsx` | 3 |
| `common:legacy.tooltip` | "Click to expand the legacy panel" | "Kliknij, aby rozwinąć stary panel" | **not alive — DEAD** | 1 |
| `common:panel.heading` † | "Panel" | "Panel" | fog from unattributed `AdminPanel.tsx` | 7 |
| `checkout:title` | "Order summary" | "Podsumowanie zamówienia" | `t('title')` over-attributed from `CheckoutSummary.tsx` | 4 |
| `checkout:buttons.cancel` | "Cancel" | "Zrezygnuj" | literal in `CheckoutForm.tsx` | 2 |
| `checkout:totals.grandTotal` | "Grand total" | "Suma całkowita" | literal in `CheckoutSummary.tsx` | 4 |
| `checkout:errors.declined` | "Your card was declined." | "Twoja karta została odrzucona." | fog from `errors.*` | 5 |
| `checkout:errors.expired` | "Your card has expired." | "Twoja karta wygasła." | fog from `errors.*` | 5 |
| `checkout:price.label` | "Price" | "Cena" | fog from unattributed `PriceLabel.tsx` | 6 |
| `admin:panel.heading` | "Admin panel" | "Panel administracyjny" | fog (default) / binding (wrapper) | 7 |
| `admin:price.label` | "Unit price" | "Cena jednostkowa" | fog from unattributed `PriceLabel.tsx` | 6 |

`admin:price.label` is genuinely unused by this app. It survives on fog alone — the accepted false
negative that Constitution rule 2 asks for.

---

## C. Expected `FileScan[]`

Identical in both runs except `AdminPanel.tsx`.

### C1. Default run — `--hook useTranslation`

| file | namespaces | keys | dynamicPatterns | unattributed |
| --- | --- | --- | --- | --- |
| `src/App.tsx` | `['common']` | `['beta.badge','actions.cancel','cta.save']` | `[]` | `false` |
| `src/CheckoutSummary.tsx` | `['common','checkout']` | `['title','totals.grandTotal']` | `[]` | `false` |
| `src/CheckoutForm.tsx` | `['checkout']` | `['buttons.cancel']` | `[]` | `false` |
| `src/ErrorBanner.tsx` | `['checkout']` | `[]` | `['errors.*']` | `false` |
| `src/PriceLabel.tsx` | `[]` | `['price.label']` | `[]` | **`true`** |
| `src/AdminPanel.tsx` | `[]` | `['panel.heading']` | `[]` | **`true`** |
| `src/useAppTranslation.ts` | `[]` | `[]` | `[]` | `false` |

### C2. Wrapper run — `--hook useTranslation useAppTranslation`

One row changes:

| file | namespaces | keys | dynamicPatterns | unattributed |
| --- | --- | --- | --- | --- |
| `src/AdminPanel.tsx` | `['admin']` | `['panel.heading']` | `[]` | `false` |

### C3. Scanner assertions embedded in these rows

- `t={t}` in `CheckoutForm.tsx` is a bare identifier, **not** a call — it must not yield a key.
- `useTranslation(ns)` in `useAppTranslation.ts` has no string literal — it must not yield a binding.
- `useAppTranslation.ts` has no `t(` call at all, so it is `unattributed: false` despite having no
  bindings. `unattributed` means "calls `t()` with nothing bound", not "has no bindings".
- `` t(`errors.${code}`) `` yields a **pattern only**. `keys` stays empty — no concrete key may be
  invented from it (Constitution rule 1).

---

## D. Expected findings — default run

`--hook useTranslation`, `--max-namespaces-per-file 1`. This is the complete list.

| # | Case | Finding |
| --- | --- | --- |
| 1 | 1 — dead key | `{ kind: 'dead-key', key: 'common:legacy.tooltip', locales: ['en','pl'] }` |
| 2 | 2 — value duplicate | `{ kind: 'value-duplicate', value: 'Cancel', keys: ['common:actions.cancel','checkout:buttons.cancel'], locale: 'en' }` |
| 3 | 3 — locale gap | `{ kind: 'locale-gap', key: 'common:beta.badge', presentIn: ['en'], missingIn: ['pl'] }` |
| 4 | 8 — convention | `{ kind: 'convention', file: 'src/CheckoutSummary.tsx', namespaces: ['common','checkout'] }` |

**Exactly four findings.** `locales` on a dead key lists the locales the key is declared in.

## E. Expected findings — wrapper run

`--hook useTranslation useAppTranslation`. Rows 1–4 above, **plus**:

| # | Case | Finding |
| --- | --- | --- |
| 9 | 7 — wrapper hook | `{ kind: 'dead-key', key: 'common:panel.heading', locales: ['en','pl'] }` |

**Exactly five findings.** The delta between D and E is the whole point of case 7: correcting the
hook name reveals a dead key the misconfigured run hid. No finding from D disappears.

---

## F. Explicit non-findings

These must **not** appear. Each is a way the analyzer could plausibly go wrong.

| # | Non-finding | Case | Why |
| --- | --- | --- | --- |
| 5 | `common:title` is **not** dead | 4 | `t('title')` in a file binding `common` + `checkout` counts as alive in both, even though only one can be real |
| 6 | `checkout:title` is **not** dead | 4 | same, other half |
| 7 | `checkout:errors.declined` is **not** dead | 5 | fogged by `errors.*` in its bound namespace, though never named literally |
| 8 | `checkout:errors.expired` is **not** dead | 5 | same |
| 10 | `checkout:price.label` is **not** dead | 6 | fogged by the unattributed file's key |
| 11 | `admin:price.label` is **not** dead | 6 | fogged the same way — a real dead key surviving, which is the accepted direction of error |
| 12 | `admin:panel.heading` is **not** dead in either run | 7 | fog in the default run, binding in the wrapper run |
| 13 | No `dead-key` finding names `errors.declined`/`errors.expired` under `common` or `admin` | 5 | `errors.*` fogs only `checkout`, the file's bound namespace — and no such keys exist there |
| 14 | No `value-duplicate` in `pl` | 2 | `common:actions.cancel` is "Anuluj", `checkout:buttons.cancel` is "Zrezygnuj" — deliberately different |
| 15 | No second `locale-gap` | 3 | every other key is declared in both `en` and `pl` |
| 16 | No `convention` finding for any file other than `CheckoutSummary.tsx` | 8 | every other file binds 0 or 1 namespace; `0 > 1` and `1 > 1` are both false |
| 17 | No concrete finding derived from `` `errors.${code}` `` | 5 | Constitution rule 1 — fog never becomes a finding |
| 18 | No silence warning in either run | 7 | bindings exist repo-wide in both; see G |

Numbers 5–18 are shared across sections D/E/F so each row has a stable id for Stage 2's unit tests
and Stage 3's integration test.

---

## G. Silence-warning matrix (Constitution rule 3)

The warning fires when the scan finds `t()` calls but **zero** hook bindings repo-wide.

| Run | Files with bindings | Files with `t()` calls | Warning |
| --- | --- | --- | --- |
| `--hook useTranslation` (default) | 4 | 6 | **no** |
| `--hook useTranslation useAppTranslation` | 5 | 6 | **no** |
| `--hook useAppTranslation` (alone) | 1 | 6 | **no** |
| `--hook useNothing` (name no file uses) | 0 | 6 | **yes** |

This fixture therefore cannot demonstrate the warning through its default configuration — Stage 4
must trigger it with a hook name nothing uses, per the last row. Flagging because PLAN.md case 7
says the wrapper file is "used later to verify the silence warning", and on its own it is not
sufficient: the other five files keep bindings non-zero.

---

## H. Raw counts for the Stage 4 summary

Stage 4's `report.json` carries "totals, fog %, unattributed %". The denominators for those
percentages are not defined anywhere yet, so this table records **counts only** and deliberately
does not invent the formulas.

| Quantity | Default run | Wrapper run |
| --- | --- | --- |
| Namespaces | 3 | 3 |
| Locales | 2 | 2 |
| Distinct KeyIds (union of locales) | 14 | 14 |
| KeyIds declared in `en` / `pl` | 14 / 13 | 14 / 13 |
| Files scanned | 7 | 7 |
| Files with ≥1 binding | 4 | 5 |
| Files `unattributed` | 2 | 1 |
| Files with ≥1 dynamic pattern | 1 | 1 |
| KeyIds alive **only** via fog or unattributed widening | 6 | 4 |
| Dead keys | 1 | 2 |

---

## I. Case → row index

| Case (PLAN.md Stage 1) | Rows |
| --- | --- |
| 1 — dead key | D1 |
| 2 — value duplicate | D2, F14 |
| 3 — locale gap | D3, F15 |
| 4 — over-attribution | D4 *(convention side)*, F5, F6 |
| 5 — fog | F7, F8, F13, F17 |
| 6 — unattributed | F10, F11 |
| 7 — wrapper hook | E9, F12, F18, G |
| 8 — convention breach | D4, F16 |
