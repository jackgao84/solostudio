/** Frame for the grown-ups' screens (smaller type, read up close) with one Done button. */
import { go } from '../../app/ctx'
import { button } from '../../ui/components'
import { h, type Child } from '../../ui/dom'

export function grownScreen(root: HTMLElement, name: string, title: string, doneTo: string | null, ...children: Child[]): HTMLElement {
  const el = h('main', { class: 'screen screen--grownup', 'data-screen': name })
  const top = h('nav', { class: 'topbar' }, h('h1', null, title), h('span', { class: 'topbar__spacer' }))
  if (doneTo) top.append(button('Done', () => go(doneTo), { variant: 'primary' }))
  el.append(top, ...(children.filter(Boolean) as Node[]))
  root.append(el)
  return el
}

export function savedNote(text: string): HTMLElement {
  return h('p', { class: 'saved-note', role: 'status' }, text)
}

export function field(label: string, input: HTMLElement, hint?: string): HTMLLabelElement {
  return h('label', { class: 'field' }, h('span', null, label), input, hint ? h('span', { class: 'note' }, hint) : null)
}
