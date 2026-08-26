import { expect, it } from 'vitest'
import { compileLocalesPattern } from './index'

it('compiles the default layout', () => {
  const { glob, match } = compileLocalesPattern('{locale}/{ns}.json')
  expect(glob).toBe('*/*.json')
  expect(match.exec('en/common.json')?.groups).toMatchObject({ locale: 'en', ns: 'common' })
  expect(match.exec('en/common.json5')).toBeNull()
})

it('compiles a flat layout with the placeholders reversed', () => {
  const { glob, match } = compileLocalesPattern('{ns}/{locale}.json')
  expect(glob).toBe('*/*.json')
  expect(match.exec('common/pl.json')?.groups).toMatchObject({ locale: 'pl', ns: 'common' })
})

it('compiles a single-directory layout', () => {
  const { glob, match } = compileLocalesPattern('{locale}.{ns}.json')
  expect(glob).toBe('*.*.json')
  expect(match.exec('en.checkout.json')?.groups).toMatchObject({ locale: 'en', ns: 'checkout' })
})

it('does not let a placeholder swallow a directory separator', () => {
  const { match } = compileLocalesPattern('{locale}/{ns}.json')
  expect(match.exec('en/nested/common.json')).toBeNull()
})

it('rejects a pattern missing a placeholder', () => {
  expect(() => compileLocalesPattern('{locale}.json')).toThrow(/must contain \{ns\}/)
  expect(() => compileLocalesPattern('{ns}.json')).toThrow(/must contain \{locale\}/)
})

it('rejects a repeated placeholder', () => {
  expect(() => compileLocalesPattern('{locale}/{locale}/{ns}.json')).toThrow(/repeats \{locale\}/)
})
