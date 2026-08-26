import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { ReportSchema } from '@i18n-xray/contracts'
import type { Report } from '@i18n-xray/contracts'
import { renderReport } from '@i18n-xray/viewer'
import { ConfigError } from './scan'

/**
 * `report.json` in, one self-contained HTML file out.
 *
 * The Zod schema is the entire input contract: anything that does not parse is
 * a config error, never something to render best-effort. A half-rendered report
 * from a malformed file is worse than no report.
 */
export async function runReport(input: {
  reportPath: string
  outPath: string
  cwd?: string
}): Promise<{ outPath: string; bytes: number }> {
  const report = await readReport(input.reportPath, input.cwd)
  const html = renderReport(report)

  const target = input.cwd === undefined ? input.outPath : path.join(input.cwd, input.outPath)
  await mkdir(path.dirname(path.resolve(target)), { recursive: true })
  await writeFile(target, html, 'utf8')
  return { outPath: input.outPath, bytes: Buffer.byteLength(html, 'utf8') }
}

export async function readReport(reportPath: string, cwd?: string): Promise<Report> {
  const source = cwd === undefined ? reportPath : path.join(cwd, reportPath)

  let raw: string
  try {
    raw = await readFile(source, 'utf8')
  } catch {
    throw new ConfigError(`cannot read report file: ${reportPath}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new ConfigError(`report file is not valid JSON: ${reportPath}`)
  }

  const result = ReportSchema.safeParse(parsed)
  if (!result.success) {
    // Zod's full dump is unreadable on a CLI; name the first few bad paths.
    const issues = result.error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
    const extra = result.error.issues.length > issues.length ? ' (…and more)' : ''
    throw new ConfigError(
      `report file does not match the report.json schema: ${reportPath}\n  ${issues.join(
        '\n  ',
      )}${extra}`,
    )
  }
  return result.data
}
