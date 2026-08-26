// CASE 6 — unattributed: this helper receives `t` as a prop and calls it. There
// is no `useTranslation` anywhere in the file, so the scanner cannot know which
// namespace `price.label` belongs to. The file must be flagged
// `unattributed: true` with an empty `namespaces` list, and its keys must fog
// conservatively across ALL namespaces.
//
// The visible consequence: `admin:price.label` is genuinely unused by this app,
// but it shares the key path `price.label`, so the fog keeps it alive. That is
// a deliberate, accepted false negative — a dead key survives rather than a
// live key being deleted.
export function PriceLabel({ t }: { t: (key: string) => string }) {
  return <span className="price">{t('price.label')}</span>
}
