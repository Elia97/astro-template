import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { Window } from 'happy-dom'

// Renders `.astro` components through the Container API, so markup contracts
// (attributes, roles, headings) are testable the way pure modules already are.
//
// [HARD] A file using these must run under `environment: 'node'` — the suite
// default. Opting one into happy-dom makes Vite resolve `astro` with browser
// conditions, so the runtime that compiles the component stops being the one
// that renders it and the call fails with `NoMatchingRenderer`.
//
// renderToFragment re-parses the output with a hand-built happy-dom Window:
// assertions stay structural instead of matching against raw HTML strings.

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
