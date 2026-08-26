/**
 * All CSS for the report, inlined. Colour roles come from a validated palette:
 * four reserved status steps (good/warning/serious/critical) plus neutral ink
 * and surfaces. Tints were computed by blending each status step with its
 * surface and checked for contrast — primary ink clears 15:1 on every light
 * tint and 10:1 on every dark one.
 *
 * Dark mode is a selected set of steps for the dark surface, declared under both
 * the OS media query and an explicit `data-theme`, not an automatic inversion.
 */
export const STYLES = `
:root {
  color-scheme: light;
  --surface: #fcfcfb;
  --plane: #f9f9f7;
  --ink: #0b0b0b;
  --ink-2: #52514e;
  --ink-muted: #898781;
  --hairline: #e1e0d9;
  --rule: #c3c2b7;
  --ring: rgba(11, 11, 11, 0.10);
  --good: #0ca30c;
  --warning: #fab219;
  --serious: #ec835a;
  --critical: #d03b3b;
  --good-tint: #d6eed5;
  --warning-tint: #fcf0d7;
  --serious-tint: #f9e9e1;
  --critical-tint: #f5dddc;
  --shadow: 0 1px 2px rgba(11, 11, 11, 0.04), 0 8px 24px rgba(11, 11, 11, 0.04);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --surface: #1a1a19;
    --plane: #0d0d0d;
    --ink: #ffffff;
    --ink-2: #c3c2b7;
    --ink-muted: #898781;
    --hairline: #2c2c2a;
    --rule: #383835;
    --ring: rgba(255, 255, 255, 0.10);
    --good-tint: #173816;
    --warning-tint: #4b3b19;
    --serious-tint: #483127;
    --critical-tint: #422120;
    --shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.3);
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --surface: #1a1a19;
  --plane: #0d0d0d;
  --ink: #ffffff;
  --ink-2: #c3c2b7;
  --ink-muted: #898781;
  --hairline: #2c2c2a;
  --rule: #383835;
  --ring: rgba(255, 255, 255, 0.10);
  --good-tint: #173816;
  --warning-tint: #4b3b19;
  --serious-tint: #483127;
  --critical-tint: #422120;
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.3);
}

* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  padding: 32px 24px 72px;
  background: var(--plane);
  color: var(--ink);
  font: 15px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif;
}
.wrap { max-width: 1180px; margin: 0 auto; }
h1, h2, h3 { margin: 0; font-weight: 620; letter-spacing: -0.01em; }
h1 { font-size: 22px; }
h2 { font-size: 15px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-2); }
h3 { font-size: 14px; }
a { color: inherit; }

.card {
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: 12px;
  box-shadow: var(--shadow);
  padding: 22px 24px;
}
section { margin-top: 24px; }
.section-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 12px; }
.section-head p { margin: 0; color: var(--ink-muted); font-size: 13px; }

/* ---------- header ---------- */
.masthead { display: flex; flex-wrap: wrap; gap: 16px 24px; align-items: baseline; }
.masthead .config { margin: 0; color: var(--ink-muted); font-size: 13px; }
.masthead .config code {
  font: 12.5px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--ink-2);
}
.stat-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 2px;
  margin-top: 22px;
  background: var(--hairline);
  border: 1px solid var(--hairline);
  border-radius: 10px;
  overflow: hidden;
}
.stat { background: var(--surface); padding: 12px 14px; }
.stat .value { font-size: 26px; font-weight: 640; line-height: 1.1; }
.stat .label { margin-top: 2px; font-size: 12px; color: var(--ink-muted); }

/* ---------- coverage bar ---------- */
.coverage { margin-top: 24px; }
.coverage-head { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; }
.coverage-head .blind { font-size: 13px; color: var(--ink-2); }
.coverage-head .blind strong { color: var(--ink); font-weight: 640; }
.bar { display: flex; gap: 2px; margin-top: 10px; height: 14px; }
.bar span { border-radius: 3px; min-width: 3px; }
.bar .b-good { background: var(--good); }
.bar .b-warning { background: var(--warning); }
.bar .b-serious { background: var(--serious); }
.bar .b-critical { background: var(--critical); }
.bucket-legend {
  display: flex; flex-wrap: wrap; gap: 6px 22px; margin-top: 12px;
  font-size: 13px; color: var(--ink-2);
}
.bucket-legend li { display: flex; align-items: baseline; gap: 7px; }
.bucket-legend .swatch {
  width: 9px; height: 9px; border-radius: 2px; flex: none; transform: translateY(-1px);
}
.bucket-legend b { color: var(--ink); font-weight: 640; font-variant-numeric: tabular-nums; }
.bucket-legend .note { color: var(--ink-muted); }
ul { list-style: none; margin: 0; padding: 0; }

/* ---------- silence banner ---------- */
.silence {
  border: 1px solid var(--critical);
  background: var(--critical-tint);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 24px;
}
.silence h2 { color: var(--ink); text-transform: none; letter-spacing: 0; font-size: 16px; }
.silence p { margin: 6px 0 0; font-size: 14px; color: var(--ink-2); }

/* ---------- treemap ---------- */
.legend { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 12.5px; color: var(--ink-2); }
.legend li { display: flex; align-items: center; gap: 6px; }
.legend .swatch { width: 10px; height: 10px; border-radius: 2px; flex: none; }
.legend .swatch.good { background: var(--good); }
.legend .swatch.warning { background: var(--warning); }
.legend .swatch.serious { background: var(--serious); }
.legend .swatch.critical { background: var(--critical); }

#treemap { position: relative; width: 100%; height: 380px; margin-top: 14px; }
.tile {
  position: absolute;
  display: block;
  overflow: hidden;
  margin: 0;
  padding: 9px 11px;
  border: 0;
  border-top: 3px solid var(--tile-accent);
  border-radius: 6px;
  background: var(--tile-fill);
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: filter 120ms ease, outline-color 120ms ease;
  outline: 2px solid transparent;
  outline-offset: -2px;
}
.tile:hover { filter: brightness(0.97); }
.tile:focus-visible { outline-color: var(--ink); }
.tile[aria-pressed="true"] { outline-color: var(--tile-accent); outline-width: 2px; }
.tile .t-name {
  font-weight: 620; font-size: 14px; line-height: 1.25;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tile .t-meta { margin-top: 2px; font-size: 12px; color: var(--ink-2); }
.tile .t-chips { display: flex; flex-wrap: wrap; gap: 4px 8px; margin-top: 6px; font-size: 11.5px; }
.tile .t-chips span { color: var(--ink-2); }
.tile.is-compact { padding: 6px 7px; }
.tile.is-compact .t-meta, .tile.is-compact .t-chips { display: none; }
.tile.is-tiny .t-name { display: none; }
.t-good { --tile-fill: var(--good-tint); --tile-accent: var(--good); }
.t-warning { --tile-fill: var(--warning-tint); --tile-accent: var(--warning); }
.t-serious { --tile-fill: var(--serious-tint); --tile-accent: var(--serious); }
.t-critical { --tile-fill: var(--critical-tint); --tile-accent: var(--critical); }

#tooltip {
  position: fixed; z-index: 20; pointer-events: none; opacity: 0;
  transition: opacity 90ms ease;
  background: var(--ink); color: var(--surface);
  padding: 8px 10px; border-radius: 8px; font-size: 12.5px; line-height: 1.45;
  max-width: 260px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22);
}
#tooltip.is-on { opacity: 1; }
#tooltip b { font-weight: 640; }

/* ---------- table view ---------- */
details.table-view { margin-top: 16px; }
details.table-view summary {
  cursor: pointer; font-size: 13px; color: var(--ink-2); width: fit-content;
}
table { border-collapse: collapse; width: 100%; margin-top: 12px; font-size: 13.5px; }
th, td { text-align: left; padding: 7px 10px; border-bottom: 1px solid var(--hairline); }
th { font-size: 12px; color: var(--ink-muted); font-weight: 560; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }

/* ---------- findings ---------- */
.ns-detail { margin-top: 0; }
.has-js .ns-detail { display: none; }
.has-js .ns-detail.is-selected { display: block; }
.detail-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px; }
.detail-head .pill {
  font-size: 11.5px; padding: 2px 8px; border-radius: 999px;
  border: 1px solid var(--tile-accent); color: var(--ink-2); background: var(--tile-fill);
}
.finding-group { margin-top: 18px; }
.finding-group > h3 { display: flex; align-items: baseline; gap: 8px; }
.finding-group > h3 .count { color: var(--ink-muted); font-weight: 400; font-size: 13px; }
.empty { color: var(--ink-muted); font-size: 13.5px; margin: 8px 0 0; }

.rows { margin-top: 10px; border-top: 1px solid var(--hairline); }
.rows > li { padding: 9px 0; border-bottom: 1px solid var(--hairline); }
.k {
  font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-all;
}
.k .ns { color: var(--ink-muted); }
.meta { margin-top: 2px; font-size: 12.5px; color: var(--ink-muted); }
.meta code { font: 12px ui-monospace, SFMono-Regular, Menlo, monospace; }

.cluster { padding: 12px 0; border-bottom: 1px solid var(--hairline); }
.cluster .value {
  font-size: 14px; font-weight: 560;
  border-left: 3px solid var(--serious); padding-left: 10px;
}
.cluster .value .q { color: var(--ink-muted); font-weight: 400; }
.cluster ul { margin-top: 8px; padding-left: 13px; }
.cluster ul li { padding: 2px 0; }

footer { margin-top: 40px; color: var(--ink-muted); font-size: 12.5px; }
@media (max-width: 640px) {
  body { padding: 20px 14px 56px; }
  #treemap { height: 460px; }
}
@media print {
  body { background: #fff; }
  .card { box-shadow: none; }
  .has-js .ns-detail { display: block; }
}
`
