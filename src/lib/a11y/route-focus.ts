// `<ClientRouter />` restores focus only inside `[data-astro-transition-persist]`
// subtrees; the template has none, so a swap drops focus to <body> (WCAG 2.4.3).

const MAIN_ID = 'main-content'

function focusMain(): void {
  if (window.location.hash) return
  const main = document.getElementById(MAIN_ID)
  if (!main) return
  // `main` carries tabindex="-1" from src/layouts/main.astro: without it, focus()
  // on a non-interactive element silently no-ops.
  main.focus({ preventScroll: true })
}

let bound = false

/** `astro:after-swap`, not `astro:page-load`: Astro's route announcer speaks 60ms
 *  after page-load, and moving focus mid-announcement cuts it short. */
export function bindRouteFocus(): void {
  if (bound) return
  bound = true
  document.addEventListener('astro:after-swap', focusMain)
}
