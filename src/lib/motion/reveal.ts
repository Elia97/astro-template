// `data-reveal-ready` is what src/styles/globals.css transitions on; the markup
// side is src/components/ui/reveal.astro.
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
  // src/components/head/js-flag.astro unhides everything unless this attribute
  // appears, so it goes before the early returns: it means "the chunk arrived".
  document.documentElement.setAttribute('data-reveal-active', '')
  if (prefersReducedMotion()) return
  const els = queryRevealTargets()
  if (els.length === 0) return
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

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (event) => {
    if (!event.matches) setupReveals()
  })
}
