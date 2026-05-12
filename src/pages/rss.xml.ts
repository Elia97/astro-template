import rss from '@astrojs/rss'
import type { APIContext } from 'astro'

export async function GET(context: APIContext): Promise<Response> {
  return rss({
    title: 'Astro Template',
    description: 'Project feed',
    site: context.site ?? 'https://example.com',
    items: [],
  })
}
