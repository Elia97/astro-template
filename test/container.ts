import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { Window } from 'happy-dom'

// [HARD] Callers run under `environment: 'node'`: happy-dom makes Vite resolve
// `astro` with browser conditions and the render fails with `NoMatchingRenderer`.

type Container = Awaited<ReturnType<typeof AstroContainer.create>>
type Renderable = Parameters<Container['renderToString']>[0]
type RenderOptions = NonNullable<Parameters<Container['renderToString']>[1]>

export async function renderToString(component: Renderable, options?: RenderOptions): Promise<string> {
  const container = await AstroContainer.create()
  return container.renderToString(component, options)
}

export async function renderToFragment(component: Renderable, options?: RenderOptions): Promise<Window['document']> {
  const html = await renderToString(component, options)
  const window = new Window()
  window.document.body.innerHTML = html
  return window.document
}
