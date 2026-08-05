/* Copyright © 2022-2026 Seneca Project Contributors, MIT License. */

import { describe, test } from 'node:test'
import { expect } from '@hapi/code'
import path from 'path'
import * as Fs from 'fs'

import Seneca from 'seneca'
import SenecaMsgTest from 'seneca-msg-test'

import TilloProvider from '..'
import TilloProviderDoc from '../dist/TilloProviderDoc'
import BasicMessages from './basic.messages'

type TilloTestConfig = {
  TILLO_API_KEY?: string
  TILLO_SECRET?: string
}

type TilloEntity = {
  entity$: string
  [key: string]: unknown
}

const testDir = path.join(__dirname, '..', 'test')

const CONFIG: TilloTestConfig = {}

if (Fs.existsSync(path.join(testDir, 'local-config.js'))) {
  Object.assign(CONFIG, require(path.join(testDir, 'local-config')))
}

describe('TilloProvider', () => {
  test('happy', async () => {
    const seneca = await makeSeneca()

    expect(TilloProvider).exist()
    expect(TilloProviderDoc).exist()

    const info = await seneca.post('sys:provider,provider:tillo,get:info')
    expect(info.ok).to.equal(true)
    expect(info.name).to.equal('tillo')
  })

  test('messages', async () => {
    const seneca = await makeSeneca()
    await SenecaMsgTest(seneca, BasicMessages)()
  })

  test('float-entity', async () => {
    const seneca = await makeSeneca()

    // Verify the float entity is registered and can be referenced.
    const floatEntity: TilloEntity = seneca.entity('provider/tillo/float')
    expect(floatEntity).exist()
    expect(floatEntity.entity$).to.equal('provider/tillo/float')
  })

  test('brand-entity', async () => {
    const seneca = await makeSeneca()

    const brandEntity: TilloEntity = seneca.entity('provider/tillo/brand')
    expect(brandEntity).exist()
    expect(brandEntity.entity$).to.equal('provider/tillo/brand')
  })

  test('dgc-entity', async () => {
    const seneca = await makeSeneca()

    const dgcEntity: TilloEntity = seneca.entity('provider/tillo/dgc')
    expect(dgcEntity).exist()
    expect(dgcEntity.entity$).to.equal('provider/tillo/dgc')
  })

  test('list-float', async () => {
    if (!CONFIG.TILLO_API_KEY) return
    const seneca = await makeSeneca()

    const list: TilloEntity[] = await seneca
      .entity('provider/tillo/float')
      .list$({
        currency: 'GBP',
      })
    console.log('FLOATS', list[0])

    expect(list.length).to.be.above(0)
  })

  test('list-brand', async () => {
    if (!CONFIG.TILLO_API_KEY) return
    const seneca = await makeSeneca()

    const list: TilloEntity[] = await seneca
      .entity('provider/tillo/brand')
      .list$({
        detail: true,
        currency: 'GBP',
        country: 'GB',
      })
    console.log('BRANDS', list)

    expect(list.length).to.be.above(0)
  })

  test('issue-gc', async () => {
    if (!CONFIG.TILLO_API_KEY) return
    const seneca = await makeSeneca()

    const redeemTemplate: TilloEntity = await seneca
      .entity('provider/tillo/dgc')
      .save$({
        user_id: 'user01',
        brand: 'hobbycraft',
        value: 10.0,
      })
    console.log('REDEEM TEMPLATE ', redeemTemplate)

    expect(redeemTemplate).exist()
  })
})

async function makeSeneca() {
  const seneca = Seneca({ legacy: false })
    .test()
    .use('promisify')
    .use('entity')
    .use('provider', {
      provider: {
        tillo: {
          keys: {
            apikey: { value: CONFIG.TILLO_API_KEY },
            secret: { value: CONFIG.TILLO_SECRET },
          },
        },
      },
    })
    .use(TilloProvider, {
      url: 'https://sandbox.tillo.dev/api/v2/',
    })

  return seneca.ready()
}
