import { pushToDataLayer } from '@/lib/analytics/data-layer'
import { createMotionBinding } from '@/lib/motion'

// Opt-in: nothing mounts this — the layout calls bindLinkTracking() once the
// project has tel:/mailto: links.

export function resolveLinkEvent(href: string): 'click_to_call' | 'click_to_email' | null {
  if (href.startsWith('tel:')) return 'click_to_call'
  if (href.startsWith('mailto:')) return 'click_to_email'
  return null
}

function handleClick(event: MouseEvent): void {
  const target = event.target
  if (!(target instanceof Element)) return
  const link = target.closest('a[href]')
  if (!(link instanceof HTMLAnchorElement)) return
  /* v8 ignore next -- the selector already required [href] */
  const href = link.getAttribute('href') ?? ''
  const eventName = resolveLinkEvent(href)
  if (eventName === null) return
  pushToDataLayer({ event: eventName, link_url: href, page_path: window.location.pathname })
}

function setup(): void {
  document.addEventListener('click', handleClick)
}

function cleanup(): void {
  document.removeEventListener('click', handleClick)
}

export const bindLinkTracking = createMotionBinding(setup, cleanup)
