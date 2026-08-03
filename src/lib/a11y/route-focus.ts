// Sitewide focus reset for `<ClientRouter />` navigations. Astro announces the
// new page on its own (the `.astro-route-announcer` live region ClientRouter
// ships), but restores focus ONLY inside `[data-astro-transition-persist]`
// subtrees — the template has none, so the swap destroys the focused node and
// focus falls back to <body>: keyboard and AT users restart from the top of the
// document on every navigation (WCAG 2.4.3).
//
// Leaf layer: no imports from the rendering tree.

const MAIN_ID = 'main-content'

function focusMain(): void {
  // Cross-page anchor (`/contatti#form`): the hash target is where the user
  // asked to land, so moving focus to <main> would undo the jump. Same-page
  // anchors never reach here — the router leaves those to the browser.
  if (window.location.hash) return
  const main = document.getElementById(MAIN_ID)
  if (!main) return
  // `main` already carries tabindex="-1" for the skip-link (src/layouts/main.astro):
  // without it focus() on a non-interactive element is a no-op, silently.
  //
  // preventScroll: Astro has already repositioned the scroll, so there is nothing
  // to gate on reduced-motion — a second, focus-driven scroll would only fight
  // the position the router just set.
  main.focus({ preventScroll: true })
}

let bound = false

/**
 * - Deliberately NOT `createMotionBinding`: that factory also runs `setup()` on
 *   the first <script> execution, and stealing focus on a cold load is a bug —
 *   the user hasn't navigated anywhere yet.
 * - `astro:after-swap`, not `astro:page-load`: the new DOM is already in place,
 *   and Astro's announcer speaks 60ms after page-load, so moving focus this
 *   early cannot cut the announcement short.
 */
export function bindRouteFocus(): void {
  if (bound) return
  bound = true
  document.addEventListener('astro:after-swap', focusMain)
}
