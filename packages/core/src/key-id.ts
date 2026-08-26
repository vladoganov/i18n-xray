import type { KeyId, Namespace } from './types'

/** i18next's namespace separator. Key paths never contain it. */
const NAMESPACE_SEPARATOR = ':'

export function makeKeyId(namespace: Namespace, key: string): KeyId {
  return `${namespace}${NAMESPACE_SEPARATOR}${key}`
}

export function parseKeyId(id: KeyId): { namespace: Namespace; key: string } {
  const at = id.indexOf(NAMESPACE_SEPARATOR)
  if (at === -1) throw new RangeError(`Malformed KeyId (no namespace separator): ${id}`)
  return { namespace: id.slice(0, at), key: id.slice(at + 1) }
}
