/** The `report` command: report.json in, one HTML file out, exit 2 on bad input. */
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderReport } from '@i18n-xray/viewer'
import { EXIT_CONFIG, EXIT_OK, main, readReport, runReport } from './index'
import type { Streams } from './index'

const VALID = fileURLToPath(new URL('./__snapshots__/report.default-run.json', import.meta.url))
let dir: string
const lines = () => {
  const out: string[] = []
  const err: string[] = []
  return { out, err, streams: { out: (l) => out.push(l), err: (l) => err.push(l) } as Streams }
}

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'i18n-xray-report-'))
})

describe('rendering', () => {
  it('writes a self-contained HTML file', async () => {
    const out = path.join(dir, 'report.html')
    const written = await runReport({ reportPath: VALID, outPath: out })
    expect(written.bytes).toBeGreaterThan(4000)
    const html = await readFile(out, 'utf8')
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).not.toMatch(/<script[^>]+\ssrc=|<link\b|https?:\/\//)
  })

  it('exits 0 through the CLI and reports where it wrote', async () => {
    const { out, streams } = lines()
    const target = path.join(dir, 'via-cli.html')
    expect(await main(['report', VALID, '-o', target], streams)).toBe(EXIT_OK)
    expect(out.join('\n')).toContain('self-contained')
  })
})

describe('input contract — exit 2, never a best-effort render', () => {
  it('rejects a file that is not there', async () => {
    const { err, streams } = lines()
    expect(await main(['report', path.join(dir, 'nope.json'), '-o', 'x.html'], streams)).toBe(
      EXIT_CONFIG,
    )
    expect(err.join('\n')).toContain('cannot read report file')
  })

  it('rejects a file that is not JSON', async () => {
    const bad = path.join(dir, 'not-json.json')
    await writeFile(bad, 'this is not json', 'utf8')
    const { err, streams } = lines()
    expect(await main(['report', bad, '-o', path.join(dir, 'x.html')], streams)).toBe(EXIT_CONFIG)
    expect(err.join('\n')).toContain('not valid JSON')
  })

  it('rejects JSON that does not match the schema, naming the bad paths', async () => {
    const bad = path.join(dir, 'wrong-shape.json')
    const report = JSON.parse(await readFile(VALID, 'utf8'))
    delete report.summary.keys.fogPct
    report.summary.namespaces = [{ name: 'common' }]
    await writeFile(bad, JSON.stringify(report), 'utf8')

    const { err, streams } = lines()
    expect(await main(['report', bad, '-o', path.join(dir, 'x.html')], streams)).toBe(EXIT_CONFIG)
    const message = err.join('\n')
    expect(message).toContain('does not match the report.json schema')
    expect(message).toContain('summary.keys.fogPct')
    await expect(readReport(bad)).rejects.toThrow(/schema/)
  })

  it('rejects a report.json from an older shape, rather than rendering half of it', async () => {
    // A pre-Stage-5 report has no summary.namespaces, so the treemap would have
    // nothing to size by. That must fail at the seam, not render empty.
    const bad = path.join(dir, 'legacy.json')
    const report = JSON.parse(await readFile(VALID, 'utf8'))
    delete report.summary.namespaces
    await writeFile(bad, JSON.stringify(report), 'utf8')
    const { err, streams } = lines()
    expect(await main(['report', bad, '-o', path.join(dir, 'x.html')], streams)).toBe(EXIT_CONFIG)
    expect(err.join('\n')).toContain('summary.namespaces')
  })

  it('requires -o', async () => {
    const { streams } = lines()
    expect(await main(['report', VALID], streams)).toBe(EXIT_CONFIG)
  })
})

describe('the real report.json on disk', () => {
  it('renders the fixture counts and finding keys', async () => {
    // The viewer's own tests use a hand-transcribed copy of this file, because
    // the viewer has no filesystem access. This is where the two are joined:
    // if the transcription drifts, these assertions and the viewer's disagree.
    const html = renderReport(await readReport(VALID))
    expect(html).toContain('<div class="value">14</div><div class="label">distinct keys</div>')
    expect(html).toContain('<div class="value">3</div><div class="label">namespaces</div>')
    expect(html).toContain('<b>7</b> verified')
    expect(html).toContain('fog <strong>14.3%</strong>')
    expect(html).toContain('unattributed <strong>28.6%</strong>')
    for (const key of ['legacy.tooltip', 'buttons.cancel', 'actions.cancel', 'beta.badge']) {
      expect(html).toContain(key)
    }
    expect(html).toContain('src/CheckoutSummary.tsx')
  })
})
