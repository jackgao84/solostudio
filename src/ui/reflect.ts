/** After Showtime, a clip or performing for family: one thing that went well, then one to work on. */
import { KID_COPY } from '../content/kid'
import { WENT_WELL, WORK_ON } from '../content/reflect'
import { button, chips } from './components'
import { h, type Child } from './dom'

const R = KID_COPY.reflect

export function reflectView(onSave: (r: { wentWell: string; workOn: string }) => void, after: Child = null): HTMLElement {
  const el = h('section', { class: 'reflect card' })
  let wentWell = ''
  let workOn = ''

  const stepOne = () => {
    const own = h('input', { type: 'text', name: 'ownWords', 'aria-label': R.ownWords, placeholder: R.ownWords, autocomplete: 'off' })
    const next = button(R.next, () => {
      wentWell = own.value.trim() || wentWell
      if (!wentWell) return
      stepTwo()
    }, { variant: 'primary' })
    el.replaceChildren(
      h('h2', null, R.wentWellTitle),
      chips(R.wentWellTitle, WENT_WELL, (v) => (wentWell = v)),
      own,
      h('div', { class: 'row' }, next),
    )
    el.setAttribute('data-step', 'well')
  }

  const stepTwo = () => {
    const own = h('input', { type: 'text', name: 'ownWords', 'aria-label': R.ownWords, placeholder: R.ownWords, autocomplete: 'off' })
    const save = button(R.save, () => {
      workOn = own.value.trim() || workOn
      if (!workOn) return
      onSave({ wentWell, workOn })
      el.replaceChildren(h('p', { class: 'reflect-saved' }, R.saved), ...(Array.isArray(after) ? after : [after]).filter(Boolean) as Node[])
    }, { variant: 'primary' })
    el.replaceChildren(h('h2', null, R.workOnTitle), chips(R.workOnTitle, WORK_ON, (v) => (workOn = v)), own, h('div', { class: 'row' }, save))
    el.setAttribute('data-step', 'work')
  }

  stepOne()
  return el
}
