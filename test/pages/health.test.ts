import { describe, expect, it } from 'vitest'

async function get(): Promise<Response> {
  const { GET } = await import('@/pages/api/health')
  return (GET as unknown as () => Response)()
}

describe('/api/health', () => {
  it('answers 200 with a JSON body', async () => {
    const response = await get()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/json')
    expect(await response.json()).toMatchObject({ status: 'ok' })
  })

  it('refuses to be cached or indexed', async () => {
    const response = await get()

    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex')
  })

  it('stamps the response time, not the build time', async () => {
    const before = Date.now()
    const { ts } = (await (await get()).json()) as { ts: string }

    expect(Date.parse(ts)).toBeGreaterThanOrEqual(before)
  })
})
