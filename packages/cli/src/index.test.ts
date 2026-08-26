import { expect, it } from 'vitest'
import { PACKAGE_NAME as CONTRACTS } from '@i18n-xray/contracts'
import { PACKAGE_NAME as CORE } from '@i18n-xray/core'
import { PACKAGE_NAME as LOADER } from '@i18n-xray/loader'
import { PACKAGE_NAME as SCANNER } from '@i18n-xray/scanner'
import { PACKAGE_NAME as VIEWER } from '@i18n-xray/viewer'
import { PACKAGE_NAME } from './index'

it('is wired', () => {
  expect(PACKAGE_NAME).toBe('i18n-xray')
})

it('resolves every internal package it bundles', () => {
  expect([CONTRACTS, CORE, LOADER, SCANNER, VIEWER]).toEqual([
    '@i18n-xray/contracts',
    '@i18n-xray/core',
    '@i18n-xray/loader',
    '@i18n-xray/scanner',
    '@i18n-xray/viewer',
  ])
})
