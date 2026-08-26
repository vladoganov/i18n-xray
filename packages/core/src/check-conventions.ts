import type { FileScan, Finding } from './types'

/**
 * Files binding more namespaces than the project allows. The threshold is the
 * caller's policy — the CLI owns the default, `core` only applies what it is
 * given. `namespaces` keeps the scan's own order rather than being sorted.
 */
export function checkConventions(scans: FileScan[], maxNamespacesPerFile: number): Finding[] {
  return scans
    .filter((scan) => scan.namespaces.length > maxNamespacesPerFile)
    .map((scan) => ({ kind: 'convention', file: scan.file, namespaces: [...scan.namespaces] }))
}
