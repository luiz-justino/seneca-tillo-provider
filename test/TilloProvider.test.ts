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

const testDir = path.join(__dirname, '..', 'test')

const NO_CREDENTIALS = 'no Tillo credentials in test/local-config.js'

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
    expectEntityCmd(seneca, 'float', 'list')
  })

  test('brand-entity', async () => {
    const seneca = await makeSeneca()
    expectEntityCmd(seneca, 'brand', 'list')
  })

  test('dgc-entity', async () => {
    const seneca = await makeSeneca()
    expectEntityCmd(seneca, 'dgc', 'save')
  })

  test('list-float', async (t) => {
    if (!CONFIG.TILLO_API_KEY) return t.skip(NO_CREDENTIALS)
    const seneca = await makeSeneca()

    const list: any[] = await seneca.entity('provider/tillo/float').list$({
      currency: 'GBP',
    })
    console.log('FLOATS', list[0])

    expect(list.length).to.be.above(0)
  })

  test('list-brand', async (t) => {
    if (!CONFIG.TILLO_API_KEY) return t.skip(NO_CREDENTIALS)
    const seneca = await makeSeneca()

    const list: any[] = await seneca.entity('provider/tillo/brand').list$({
      detail: true,
      currency: 'GBP',
      country: 'GB',
    })
    console.log('BRANDS', list)

    expect(list.length).to.be.above(0)
  })

  test('issue-gc', async (t) => {
    if (!CONFIG.TILLO_API_KEY) return t.skip(NO_CREDENTIALS)
    const seneca = await makeSeneca()

    const redeemTemplate = await seneca.entity('provider/tillo/dgc').save$({
      user_id: 'user01',
      brand: 'hobbycraft',
      value: 10.0,
    })
    console.log('REDEEM TEMPLATE ', redeemTemplate)

    expect(redeemTemplate).exist()
  })
})

function expectEntityCmd(seneca: any, name: string, cmd: string) {
  const msg = {
    sys: 'entity',
    cmd,
    zone: 'provider',
    base: 'tillo',
    name,
  }

  expect(seneca.find(msg).pattern).to.equal(
    `base:tillo,cmd:${cmd},name:${name},sys:entity,zone:provider`,
  )
}

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
