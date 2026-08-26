# i18n-xray

X-ray for your i18n. A CLI that statically analyzes how a React codebase uses i18next-style
translations — dead keys, duplicated values across namespaces, locale gaps, and convention
breaches — and renders the result as a single self-contained HTML report. It is deliberately
coarse where it cannot be certain: dynamic keys fog a subtree rather than producing a guess, so a
live key is never reported dead.

**Status: in active development.** Not yet published; nothing here is stable.

## License

MIT
