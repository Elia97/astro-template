import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const initBotId = vi.fn()
vi.mock('botid/client/core', () => ({ initBotId }))

async function load(prod: boolean) {
  vi.resetModules()
  vi.stubEnv('PROD', prod)
  return (await import('@/components/forms/botid')).initFormBotId
}

beforeEach(() => {
  initBotId.mockClear()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('initFormBotId', () => {
  it('does nothing outside production', async () => {
    const init = await load(false)

    init()

    expect(initBotId).not.toHaveBeenCalled()
  })

  it('protects the contact action path in production', async () => {
    const init = await load(true)

    init()

    expect(initBotId).toHaveBeenCalledWith({ protect: [{ path: '/_actions/contact', method: 'POST' }] })
  })

  it('initializes once even when called again', async () => {
    const init = await load(true)

    init()
    init()

    expect(initBotId).toHaveBeenCalledTimes(1)
  })
})
