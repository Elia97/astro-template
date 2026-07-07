// Client behavior for ui/select.astro. Progressive enhancement contract:
// the native <select> stays the single source of truth — the custom listbox
// writes into it and re-dispatches `change`, so forms and any external
// listeners keep working exactly as with a plain select.
import { createMotionBinding } from '@/lib/motion'

interface SelectElements {
  native: HTMLSelectElement
  trigger: HTMLButtonElement
  listbox: HTMLElement
}

function selectedOptionInfo(native: HTMLSelectElement): { text: string; hasValue: boolean } {
  const selected = native.selectedOptions[0]
  return { text: selected?.text ?? '', hasValue: Boolean(selected?.value) }
}

function syncTriggerLabel(root: HTMLElement): void {
  const native = root.querySelector<HTMLSelectElement>('[data-select-native]')
  const label = root.querySelector<HTMLElement>('[data-select-value]')
  if (!native || !label) return
  const { text, hasValue } = selectedOptionInfo(native)
  label.textContent = text
  // Placeholder (empty value) renders muted like the native one would.
  label.classList.toggle('text-muted-foreground', !hasValue)
}

function closeListbox(root: HTMLElement): void {
  root.querySelector<HTMLButtonElement>('[data-select-trigger]')?.setAttribute('aria-expanded', 'false')
  root.querySelector<HTMLElement>('[data-select-listbox]')?.classList.add('hidden')
}

function openListbox(root: HTMLElement): void {
  const listbox = root.querySelector<HTMLElement>('[data-select-listbox]')
  root.querySelector<HTMLButtonElement>('[data-select-trigger]')?.setAttribute('aria-expanded', 'true')
  listbox?.classList.remove('hidden')
  const current = listbox?.querySelector<HTMLElement>('[aria-selected="true"]')
  ;(current ?? listbox?.querySelector<HTMLElement>('[role="option"]'))?.focus()
}

function updateNativeValue(native: HTMLSelectElement | null, value: string): void {
  if (!native) return
  native.value = value
  native.dispatchEvent(new Event('change', { bubbles: true }))
}

function markSelectedOption(listbox: HTMLElement | null, option: HTMLElement): void {
  for (const item of listbox?.querySelectorAll<HTMLElement>('[role="option"]') ?? []) {
    item.setAttribute('aria-selected', String(item === option))
  }
}

function selectOption(root: HTMLElement, option: HTMLElement): void {
  const native = root.querySelector<HTMLSelectElement>('[data-select-native]')
  const listbox = root.querySelector<HTMLElement>('[data-select-listbox]')
  updateNativeValue(native, option.dataset.value ?? '')
  markSelectedOption(listbox, option)
  syncTriggerLabel(root)
  closeListbox(root)
  root.querySelector<HTMLButtonElement>('[data-select-trigger]')?.focus()
}

function moveActive(root: HTMLElement, delta: 1 | -1): void {
  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-select-listbox] [role="option"]'))
  if (items.length === 0) return
  const currentIndex = items.indexOf(document.activeElement as HTMLElement)
  const nextIndex =
    currentIndex === -1 ? (delta === 1 ? 0 : items.length - 1) : (currentIndex + delta + items.length) % items.length
  items[nextIndex]?.focus()
}

function focusNextOption(root: HTMLElement, event: KeyboardEvent): void {
  event.preventDefault()
  moveActive(root, 1)
}

function focusPreviousOption(root: HTMLElement, event: KeyboardEvent): void {
  event.preventDefault()
  moveActive(root, -1)
}

function selectActiveOption(root: HTMLElement, event: KeyboardEvent): void {
  event.preventDefault()
  if (document.activeElement instanceof HTMLElement) {
    selectOption(root, document.activeElement)
  }
}

function dismissListbox(root: HTMLElement, event: KeyboardEvent, trigger: HTMLButtonElement): void {
  event.preventDefault()
  closeListbox(root)
  trigger.focus()
}

type ListboxKeyHandler = (root: HTMLElement, event: KeyboardEvent, trigger: HTMLButtonElement) => void

const listboxKeyHandlers: Record<string, ListboxKeyHandler> = {
  ArrowDown: focusNextOption,
  ArrowUp: focusPreviousOption,
  Enter: selectActiveOption,
  ' ': selectActiveOption,
  Escape: dismissListbox,
  Tab: closeListbox,
}

function createListboxKeydownHandler(root: HTMLElement, trigger: HTMLButtonElement): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent) => {
    listboxKeyHandlers[event.key]?.(root, event, trigger)
  }
}

function bindSelectHandlers(root: HTMLElement, { trigger, listbox }: SelectElements): () => void {
  const onTriggerClick = () => {
    const isOpen = trigger.getAttribute('aria-expanded') === 'true'
    if (isOpen) closeListbox(root)
    else openListbox(root)
  }
  const onTriggerKeydown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openListbox(root)
    }
  }
  const onListboxKeydown = createListboxKeydownHandler(root, trigger)
  const onOptionClick = (event: MouseEvent) => {
    if (!(event.target instanceof HTMLElement)) return
    const option = event.target.closest<HTMLElement>('[role="option"]')
    if (option) selectOption(root, option)
  }
  const onDocumentClick = (event: MouseEvent) => {
    if (event.target instanceof Node && !root.contains(event.target)) {
      closeListbox(root)
    }
  }

  trigger.addEventListener('click', onTriggerClick)
  trigger.addEventListener('keydown', onTriggerKeydown)
  listbox.addEventListener('keydown', onListboxKeydown)
  listbox.addEventListener('click', onOptionClick)
  document.addEventListener('click', onDocumentClick)

  return () => {
    trigger.removeEventListener('click', onTriggerClick)
    trigger.removeEventListener('keydown', onTriggerKeydown)
    listbox.removeEventListener('keydown', onListboxKeydown)
    listbox.removeEventListener('click', onOptionClick)
    document.removeEventListener('click', onDocumentClick)
  }
}

const cleanups: Array<() => void> = []

function findSelectElements(root: HTMLElement): SelectElements | undefined {
  const native = root.querySelector<HTMLSelectElement>('[data-select-native]')
  const trigger = root.querySelector<HTMLButtonElement>('[data-select-trigger]')
  const listbox = root.querySelector<HTMLElement>('[data-select-listbox]')
  if (!native || !trigger || !listbox) return undefined
  return { native, trigger, listbox }
}

function activateSelect(root: HTMLElement, { native, trigger }: SelectElements): void {
  syncTriggerLabel(root)
  native.classList.remove('flex')
  native.classList.add('hidden')
  native.setAttribute('aria-hidden', 'true')
  native.tabIndex = -1
  trigger.classList.remove('hidden')
  trigger.classList.add('flex')
}

function setupSelects(): void {
  for (const root of document.querySelectorAll<HTMLElement>('[data-select-root]')) {
    const elements = findSelectElements(root)
    // Already-activated roots (hidden native) must not be double-bound: setup
    // re-runs on the initial load (see createMotionBinding's contract).
    if (!elements || elements.native.classList.contains('hidden')) continue

    activateSelect(root, elements)
    cleanups.push(bindSelectHandlers(root, elements))
  }
}

function cleanupSelects(): void {
  for (const cleanup of cleanups.splice(0)) cleanup()
}

export const bindSelects = createMotionBinding(setupSelects, cleanupSelects)
