// Parsing innerHTML, happy-dom ignores a `selected` attribute and reports the first
// enabled option, so the current value is assigned instead.
export function renderSelect({ value = '', required = true } = {}): void {
  document.body.innerHTML = `
    <label for="topic">Argomento</label>
    <div class="relative" data-select-root>
      <select class="flex" data-select-native id="topic" name="topic"${required ? ' required' : ''}
              aria-describedby="topic-error">
        <option value="" disabled>Scegli</option>
        <option value="consulenza">Consulenza</option>
        <option value="preventivo">Preventivo</option>
      </select>
      <button type="button" data-select-trigger aria-haspopup="listbox" aria-expanded="false" class="hidden">
        <span data-select-value></span>
      </button>
      <ul role="listbox" data-select-listbox class="hidden">
        <li role="option" data-value="consulenza" aria-selected="false" tabindex="-1">Consulenza</li>
        <li role="option" data-value="preventivo" aria-selected="false" tabindex="-1">Preventivo</li>
      </ul>
    </div>
    <p id="topic-error">Campo obbligatorio</p>`
  const control = document.querySelector<HTMLSelectElement>('[data-select-native]')
  if (control) control.value = value
}

export async function activate(): Promise<void> {
  const { bindSelects } = await import('@/components/ui/select-behavior')
  bindSelects()
}

export const trigger = (): HTMLButtonElement => document.querySelector('[data-select-trigger]') as HTMLButtonElement
export const native = (): HTMLSelectElement => document.querySelector('[data-select-native]') as HTMLSelectElement
export const listbox = (): HTMLElement => document.querySelector('[data-select-listbox]') as HTMLElement
export const options = (): HTMLElement[] => Array.from(listbox().querySelectorAll<HTMLElement>('[role="option"]'))
export const isOpen = (): boolean => trigger().getAttribute('aria-expanded') === 'true'
export const key = (el: Element, k: string): void => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
}
