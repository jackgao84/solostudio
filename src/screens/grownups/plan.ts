/**
 * Show and plan: her name (optional), the song's name (optional), the show and its date, the holiday
 * dates, minutes per day and the weekly light day. Saving finishes setup and asks the browser to keep
 * storage. "Reset the plan" starts a new plan from today for a new show, keeping everything learned.
 */
import { save, today, update } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { isDayKey } from '../../model/dates'
import { resetForNewShow } from '../../model/shows'
import { requestPersistence } from '../../storage/persist'
import { DEFAULT_HOLIDAY_MINUTES, DEFAULT_SCHOOL_MINUTES } from '../../storage/schema'
import { store } from '../../storage/store'
import { button, confirmButton } from '../../ui/components'
import { h } from '../../ui/dom'
import { field, grownScreen, savedNote } from './common'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export async function askPersistenceOnce(): Promise<void> {
  if (save().setup.persistAsked) return
  update((d) => (d.setup.persistAsked = true))
  const kept = await requestPersistence()
  update((d) => (d.setup.persisted = kept))
}

export const planScreen: Screen = (root) => {
  const d = save()
  const input = (name: string, value: string, type = 'text', extra: Record<string, string | number> = {}) => h('input', { name, type, value, autocomplete: 'off', ...extra })
  const performerName = input('performerName', d.profile.name)
  const songName = input('songName', d.profile.songName)
  const showName = input('showName', d.show?.name ?? '')
  const showDate = input('showDate', d.show?.date ?? '', 'date')
  const holidayStart = input('holidayStart', d.plan?.holidayStart ?? '', 'date')
  const holidayEnd = input('holidayEnd', d.plan?.holidayEnd ?? '', 'date')
  const schoolMinutes = input('schoolMinutes', String(d.plan?.schoolMinutes ?? DEFAULT_SCHOOL_MINUTES), 'number', { min: 15, max: 180, step: 5, inputmode: 'numeric' })
  const holidayMinutes = input('holidayMinutes', String(d.plan?.holidayMinutes ?? DEFAULT_HOLIDAY_MINUTES), 'number', { min: 15, max: 240, step: 5, inputmode: 'numeric' })
  const lightWeekday = h('select', { name: 'lightWeekday' }, ...DAYS.map((day, i) => h('option', { value: i, selected: (d.plan?.lightWeekday ?? 0) === i }, day)))
  const status = h('div', { class: 'form-status' })

  const form = h(
    'form',
    { class: 'plan-form card stack' },
    h('p', { class: 'note' }, 'Her name, the show and the dates stay on this iPad. They are never part of the app’s code.'),
    h(
      'div',
      { class: 'form-grid' },
      field('Her name (shown as “Hi, …!”)', performerName),
      field('Song name (optional)', songName),
      field('Show name', showName, 'For example: Showcase'),
      field('Show date', showDate),
      field('Holidays start', holidayStart, 'Leave empty if there are none before the show.'),
      field('Holidays end (optional)', holidayEnd, 'Empty means the holidays last until the show.'),
      field('Minutes on a school day', schoolMinutes),
      field('Minutes on a holiday', holidayMinutes),
      field('Lighter day each week', lightWeekday),
    ),
    status,
    h('div', { class: 'row' }, button('Save plan', () => undefined, { type: 'submit', variant: 'primary' })),
  )
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const date = showDate.value
    if (!isDayKey(date)) {
      status.replaceChildren(h('p', { class: 'import-error' }, 'Pick the show date first.'))
      return
    }
    const minutes = (el: HTMLInputElement, def: number) => Math.min(240, Math.max(15, Math.round(Number(el.value) || def)))
    update((s) => {
      s.profile.name = performerName.value.trim()
      s.profile.songName = songName.value.trim()
      s.show = { name: showName.value.trim() || 'the show', date }
      s.plan = {
        startDate: s.plan?.startDate && s.plan.startDate <= today() ? s.plan.startDate : today(),
        holidayStart: isDayKey(holidayStart.value) ? holidayStart.value : null,
        holidayEnd: isDayKey(holidayEnd.value) ? holidayEnd.value : null,
        schoolMinutes: minutes(schoolMinutes, DEFAULT_SCHOOL_MINUTES),
        holidayMinutes: minutes(holidayMinutes, DEFAULT_HOLIDAY_MINUTES),
        lightWeekday: Number(lightWeekday.value) || 0,
      }
      s.setup.complete = true
    })
    store().flush()
    status.replaceChildren(savedNote('Saved. Today’s plan is ready.'))
    void askPersistenceOnce()
  })

  const el = grownScreen(root, 'grownups-plan', 'Show and plan', '/grownups', form)

  if (d.show) {
    const newName = input('newShowName', '')
    const newDate = input('newShowDate', '', 'date')
    const resetStatus = h('div', { class: 'form-status' })
    const reset = h(
      'form',
      { class: 'reset-form card stack' },
      h('h2', null, 'A new show'),
      h('p', { class: 'note' }, 'For the next show (the talent show after the showcase): the plan starts again from today and counts back from the new date. Sections, lines, marks and everything she has ticked stay as they are.'),
      h('div', { class: 'form-grid' }, field('New show name', newName), field('New show date', newDate)),
      resetStatus,
      h(
        'div',
        { class: 'row' },
        confirmButton('Reset the plan for this show', 'Yes, reset it', () => {
          if (!isDayKey(newDate.value) || newDate.value < today()) {
            resetStatus.replaceChildren(h('p', { class: 'import-error' }, 'Pick a new show date from today on.'))
            return
          }
          store().writeBackup()
          store().replace(resetForNewShow(save(), { name: newName.value.trim() || 'the show', date: newDate.value }, today()))
          showName.value = save().show?.name ?? ''
          showDate.value = save().show?.date ?? ''
          resetStatus.replaceChildren(savedNote('Done. The plan now counts back from the new show.'))
        }),
      ),
    )
    reset.addEventListener('submit', (e) => e.preventDefault())
    el.append(reset)
  }
}
