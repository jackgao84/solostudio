/**
 * Shared pieces. Every label comes from the caller (src/content), so nothing here is copy.
 */
import { h, type Child } from './dom'

export interface ButtonOpts {
  class?: string
  label?: string
  variant?: 'primary' | 'quiet' | 'big' | 'chip'
  disabled?: boolean
  type?: 'button' | 'submit'
}

export function button(text: Child, onClick: (e: Event) => void, opts: ButtonOpts = {}): HTMLButtonElement {
  const cls = ['btn', opts.variant ? `btn--${opts.variant}` : '', opts.class ?? ''].filter(Boolean).join(' ')
  return h('button', { type: opts.type ?? 'button', class: cls, 'aria-label': opts.label, disabled: opts.disabled, onclick: onClick }, text)
}

/** A role="switch" toggle. */
export function toggle(label: string, on: boolean, onChange: (on: boolean) => void, cls = ''): HTMLButtonElement {
  const el = h('button', { type: 'button', role: 'switch', class: `switch ${cls}`.trim(), 'aria-checked': on ? 'true' : 'false' }, h('span', { class: 'switch__track', 'aria-hidden': 'true' }, h('span', { class: 'switch__knob' })), h('span', { class: 'switch__label' }, label))
  el.addEventListener('click', () => {
    const next = el.getAttribute('aria-checked') !== 'true'
    el.setAttribute('aria-checked', next ? 'true' : 'false')
    onChange(next)
  })
  return el
}

/** A radiogroup of chips. */
export function chips(label: string, options: readonly string[], onPick: (value: string) => void, cls = ''): HTMLDivElement {
  const group = h('div', { role: 'radiogroup', 'aria-label': label, class: `chips ${cls}`.trim() })
  for (const o of options) {
    const chip = h('button', { type: 'button', role: 'radio', class: 'chip', 'aria-checked': 'false' }, o)
    chip.addEventListener('click', () => {
      for (const c of Array.from(group.querySelectorAll('[role="radio"]'))) c.setAttribute('aria-checked', c === chip ? 'true' : 'false')
      onPick(o)
    })
    group.append(chip)
  }
  return group
}

/** A press-and-hold button: fills over `ms`, then calls onDone. Letting go early cancels. */
export function holdButton(text: string, ms: number, onDone: () => void, cls = ''): HTMLButtonElement {
  const fillEl = h('span', { class: 'hold__fill', 'aria-hidden': 'true' })
  const el = h('button', { type: 'button', class: `btn hold ${cls}`.trim() }, fillEl, h('span', { class: 'hold__label' }, text))
  el.style.setProperty('--hold-ms', `${ms}ms`)
  let timer = 0
  const cancel = () => {
    window.clearTimeout(timer)
    timer = 0
    el.classList.remove('is-holding')
  }
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    if (timer) return
    el.classList.add('is-holding')
    timer = window.setTimeout(() => {
      timer = 0
      el.classList.remove('is-holding')
      onDone()
    }, ms)
  })
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, cancel)
  el.addEventListener('contextmenu', (e) => e.preventDefault())
  return el
}

/** A two-step button: the first tap asks, the second (on the confirm label) does it. */
export function confirmButton(text: string, sure: string, onConfirm: () => void, cls = ''): HTMLButtonElement {
  let armed = false
  const el = button(text, () => {
    if (!armed) {
      armed = true
      el.textContent = sure
      el.classList.add('is-armed')
      return
    }
    onConfirm()
  }, { class: cls })
  return el
}

/** A styled file picker: a ≥48 px label around a hidden file input. */
export function filePick(text: string, name: string, accept: string, onFile: (f: File) => void): HTMLLabelElement {
  const input = h('input', { type: 'file', name, accept, class: 'sr-only' })
  input.addEventListener('change', () => {
    const f = input.files?.[0]
    if (f) onFile(f)
    input.value = ''
  })
  return h('label', { class: 'btn file-pick' }, text, input)
}
