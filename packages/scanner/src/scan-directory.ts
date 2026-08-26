import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { FileScan } from '@i18n-xray/core'
import { scanSource } from './scan-source'
import type { ScanOptions } from './scan-source'
import fg from 'fast-glob'

export const DEFAULT_SOURCE_GLOB = '**/*.{ts,tsx,js,jsx}'

export type ScanDirectoryOptions = ScanOptions & {
  /** Directory `srcDir` is resolved against. Defaults to the process cwd. */
  cwd?: string
}

/**
 * Scan every source file under `srcDir`. Reported paths are `srcDir`-prefixed
 * and slash-separated, so running `scan src` yields `src/App.tsx` — the form
 * EXPECTED.md uses.
 */
export async function scanDirectory(
  srcDir: string,
  options: ScanDirectoryOptions = {},
): Promise<FileScan[]> {
  const base = options.cwd === undefined ? srcDir : path.join(options.cwd, srcDir)
  const relatives = (
    await fg(DEFAULT_SOURCE_GLOB, {
      cwd: base,
      onlyFiles: true,
      ignore: ['**/node_modules/**'],
    })
  ).sort()

  return Promise.all(
    relatives.map(async (relative) => {
      const source = await readFile(path.join(base, relative), 'utf8')
      return scanSource(toPosix(path.join(srcDir, relative)), source, options)
    }),
  )
}

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join('/')
}
