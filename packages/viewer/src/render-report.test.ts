/**
 * The viewer's own tests. Visual quality is reviewed by hand; these guard the
 * things a screenshot cannot: that the input contract is enforced, that the
 * document is genuinely self-contained, and that the fixture's numbers and keys
 * actually reach the page.
 */
import { describe, expect, it } from 'vitest'
import { ReportSchema } from '@i18n-xray/contracts'
import { clone, FIXTURE_REPORT } from './fixture-report'
import { renderReport } from './index'

const report = ReportSchema.parse(FIXTURE_REPORT)
const html = renderReport(report)

describe('input contract', () => {
  it('accepts a report that satisfies the schema', () => {
    expect(() => renderReport(ReportSchema.parse(clone(report)))).not.toThrow()
  })

  it.each([
    ['a missing summary', (bad: Record<string, unknown>) => delete bad['summary']],
    ['an unknown top-level field', (bad: Record<string, unknown>) => (bad['extra'] = 1)],
    [
      'a finding of an unknown kind',
      (bad: Record<string, unknown>) => ((bad['findings'] as unknown[])[0] = { kind: 'nope' }),
    ],
    [
      'a namespace summary with no key count',
      (bad: Record<string, unknown>) => {
        ;(bad['summary'] as { namespaces: unknown[] }).namespaces = [{ name: 'x' }]
      },
    ],
  ])('rejects %s at the schema, before any rendering', (_label, corrupt) => {
    const bad = clone(report) as unknown as Record<string, unknown>
    corrupt(bad)
    expect(ReportSchema.safeParse(bad).success).toBe(false)
  })
})

describe('self-contained', () => {
  it('makes no network request of any kind', () => {
    expect(html).not.toMatch(/<link\b/i)
    expect(html).not.toMatch(/<script[^>]+\ssrc=/i)
    expect(html).not.toMatch(/https?:\/\//)
    expect(html).not.toMatch(/\burl\(\s*['"]?(?:https?:)?\/\//i)
    expect(html).not.toMatch(/@import/i)
    expect(html).not.toMatch(/\bfetch\(|XMLHttpRequest|EventSource|WebSocket/)
  })

  it('inlines its stylesheet and script', () => {
    expect(html).toContain('<style>')
    expect(html).toContain('<div id="treemap"></div>')
    expect(html).toContain('squarify')
  })

  it('escapes the embedded JSON so a translation value cannot close the block', () => {
    const withScript = clone(report)
    withScript.summary.namespaces = [{ name: '</script><img src=x>', keys: 3 }]
    const rendered = renderReport(withScript)
    expect(rendered).not.toContain('</script><img src=x>')
    expect(rendered).toContain('\\u003c/script')
  })

  it('escapes finding text into HTML', () => {
    const withHtml = clone(report)
    withHtml.findings = [
      {
        kind: 'value-duplicate',
        value: '<b>bold</b> & "quoted"',
        keys: ['a:x', 'b:y'],
        locale: 'en',
      },
    ]
    withHtml.summary.namespaces = [
      { name: 'a', keys: 1 },
      { name: 'b', keys: 1 },
    ]
    const rendered = renderReport(withHtml)
    expect(rendered).not.toContain('<b>bold</b>')
    expect(rendered).toContain('&lt;b&gt;bold&lt;/b&gt; &amp; &quot;quoted&quot;')
  })
})

describe('the fixture report reaches the page', () => {
  it('shows the header counts', () => {
    // 2 locales, 3 namespaces, 14 keys, 7 files, 4 findings.
    for (const [value, label] of [
      [2, 'locales'],
      [3, 'namespaces'],
      [14, 'distinct keys'],
      [7, 'files scanned'],
      [4, 'findings'],
    ] as const) {
      expect(html).toContain(`<div class="value">${value}</div><div class="label">${label}</div>`)
    }
  })

  it('shows the four §H buckets and both percentages', () => {
    expect(html).toContain('<b>7</b> verified')
    expect(html).toContain('<b>2</b> fog-alive')
    expect(html).toContain('<b>4</b> unattributed')
    expect(html).toContain('<b>1</b> dead')
    expect(html).toContain('fog <strong>14.3%</strong>')
    expect(html).toContain('unattributed <strong>28.6%</strong>')
    expect(html).toContain('<strong>42.9%</strong> of keys cannot be judged')
  })

  it('embeds every namespace with its key count for the treemap', () => {
    const data = JSON.parse(
      /<script id="report-data" type="application\/json">(.*?)<\/script>/s.exec(html)?.[1] ?? '{}',
    )
    expect(data.namespaces).toEqual([
      {
        name: 'admin',
        label: 'admin',
        keys: 2,
        dead: 0,
        duplicated: 0,
        severity: 'good',
        severityLabel: 'clean',
      },
      {
        name: 'checkout',
        label: 'checkout',
        keys: 6,
        dead: 0,
        duplicated: 1,
        severity: 'warning',
        severityLabel: 'minor',
      },
      {
        name: 'common',
        label: 'common',
        keys: 6,
        dead: 1,
        duplicated: 1,
        severity: 'serious',
        severityLabel: 'notable',
      },
    ])
    expect(data.initialSelection).toBe('common')
  })

  it('lists the dead key under its own namespace panel', () => {
    const commonPanel = section(html, 'common')
    expect(commonPanel).toContain('legacy.tooltip')
    expect(commonPanel).toContain('declared in en, pl')
    expect(section(html, 'admin')).not.toContain('legacy.tooltip')
  })

  it('groups the value-duplicate cluster under both namespaces it spans', () => {
    for (const namespace of ['common', 'checkout']) {
      const panel = section(html, namespace)
      expect(panel).toContain('Cancel')
      expect(panel).toContain('checkout:buttons.cancel'.replace(':', ':</span>'))
      expect(panel).toContain('2 keys share this text')
    }
  })

  it('keeps convention and locale-gap out of the namespace tiles', () => {
    expect(section(html, 'common')).not.toContain('CheckoutSummary')
    expect(html).toContain('src/CheckoutSummary.tsx')
    expect(html).toContain('binds 2 namespaces: common, checkout')
    expect(html).toContain('beta.badge')
    expect(html).toContain('missing from pl')
  })

  it('renders a table view of the treemap for the no-colour case', () => {
    expect(html).toContain('<summary>Table view</summary>')
    expect(html).toContain('<td>checkout</td><td class="num">6</td>')
  })

  it('omits the silence banner when the scan bound at least one hook', () => {
    expect(html).not.toContain('Suspicious silence')
  })

  it('carries the silence banner into the HTML when the scan was blind', () => {
    const silent = clone(report)
    silent.summary.silenceWarning = true
    expect(renderReport(silent)).toContain('Suspicious silence')
  })
})

/** The markup for one namespace's detail panel. */
function section(document: string, namespace: string): string {
  const start = document.indexOf(`data-ns="${namespace}"`)
  const end = document.indexOf('</section>', start)
  return document.slice(start, end)
}
