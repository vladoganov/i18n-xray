import { expect, it } from 'vitest'
import { PACKAGE_NAME as CONTRACTS } from '@i18n-xray/contracts'
import { PACKAGE_NAME } from './index'

it('is wired', () => {
  expect(PACKAGE_NAME).toBe('@i18n-xray/viewer')
})

it('resolves its dependency on contracts', () => {
  expect(CONTRACTS).toBe('@i18n-xray/contracts')
})
