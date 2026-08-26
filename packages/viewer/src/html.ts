/** Escape text for interpolation into HTML element content or an attribute. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Serialise data for an inline `<script type="application/json">` block.
 * Escaping `<` is what stops a translation value containing `</script>` from
 * ending the block early — user strings reach this file verbatim.
 */
export function embedJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
