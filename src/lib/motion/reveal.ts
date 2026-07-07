// Reveal-on-scroll setup (see components/reveal.astro for the markup side).
// An IntersectionObserver marks `[data-reveal]` / `[data-reveal-stagger]`
// containers with `data-reveal-ready` on viewport entry; the transition is
// pure CSS (initial state gated on `html.js` + reduced-motion, globals.css).
import { createMotionBinding } from './binding'
import { prefersReducedMotion } from './media-queries'

let primary: IntersectionObserver | null = null
let fallback: IntersectionObserver | null = null

function onIntersect(entries: IntersectionObserverEntry[], self: IntersectionObserver): void {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue
    entry.target.setAttribute('data-reveal-ready', '')
    self.unobserve(entry.target)
  }
}

function queryRevealTargets(): NodeListOf<HTMLElement> {
  return document.querySelectorAll<HTMLElement>(
    '[data-reveal]:not([data-reveal-ready]), [data-reveal-stagger]:not([data-reveal-ready])',
  )
}

function isBelowRevealLine(el: HTMLElement, maxScrollY: number, revealLine: number): boolean {
  const absoluteTop = el.getBoundingClientRect().top + window.scrollY
  return absoluteTop - maxScrollY > revealLine
}

function setupReveals(): void {
  if (prefersReducedMotion()) return
  const els = queryRevealTargets()
  if (els.length === 0) return
  // The primary observer reveals slightly before the element's natural entry
  // point. Elements that can never cross the shrunk boundary (sitting in the
  // bottom ~15% of the page at max scroll) go to the no-margin fallback,
  // otherwise they would stay hidden forever.
  primary ??= new IntersectionObserver(onIntersect, { rootMargin: '0px 0px -15% 0px' })
  fallback ??= new IntersectionObserver(onIntersect)
  const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
  const revealLine = window.innerHeight * 0.85
  for (const el of els) {
    if (isBelowRevealLine(el, maxScrollY, revealLine)) fallback.observe(el)
    else primary.observe(el)
  }
}

function cleanupReveals(): void {
  primary?.disconnect()
  fallback?.disconnect()
  primary = null
  fallback = null
}

export const bindReveals = createMotionBinding(setupReveals, cleanupReveals)

// Re-arm if the user turns reduced-motion OFF mid-session: the CSS gate
// starts hiding [data-reveal] elements and something must reveal them again.
// (window guard: the module must stay importable outside the browser.)
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (event) => {
    if (!event.matches) setupReveals()
  })
}
