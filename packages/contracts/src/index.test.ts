import { expect, it } from 'vitest'
import { z } from 'zod'
import { PACKAGE_NAME } from './index'

it('is wired', () => {
  expect(PACKAGE_NAME).toBe('@i18n-xray/contracts')
})

it('resolves zod, the toolchain that will define the schemas', () => {
  expect(typeof z.string).toBe('function')
})
