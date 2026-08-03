import { pushToDataLayer } from '@/lib/analytics/data-layer'
import { createMotionBinding } from '@/lib/motion'

// Opt-in: not mounted by the layout. The starter's chrome has no tel:/mailto:
// anchors, so binding it by default would cost every page a listener for events
// that can't fire. Mount it from the layout (`bindLinkTracking()`) once the
// project has contact links worth measuring.
//
// Delegated on the document so it covers anchors rendered anywhere and survives
// ClientRouter navigations. The dataLayer bridge queues harmlessly until the
// consent-gated GTM container loads, so emitting here is safe even with
// tracking off.

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
