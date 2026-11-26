/**
 * Setup as a wizard (version 1.2), about 10 minutes, that can be paused (just leave) and picked up
 * where it was. The app is usable once the first three steps are done: her track, her lines (all in
 * one box) and where each section starts (one play of her track, a tap as each section starts). The
 * rest are optional and can be done later: the mirrored follow-along tapped the same way, line
 * timing (spread evenly as a first guess; tap-along to refine), the beat (worked out from her track
 * and checked against a click: no tapping by hand), and the dates, minutes and her walk-on time.
 * The detailed screens in the grown-ups' area stay for changes later.
 */
import { go, save, sectionsInOrder, today, update } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { click } from '../../audio/sfx'
import { STANDARD_SECTIONS } from '../../content/narration'
import { detectFromBlob } from '../../media/beat-run'
import type { Player } from '../../media/player'
import { probeDuration, trackPlayer, unloadTrack } from '../../media/track'
import { doubleTempo, halfTempo, nudgeOffset } from '../../model/beat'
import { isDayKey } from '../../model/dates'
import { applySongText, clickTimes, nudgeStart, parseSongText, setupUsable, songText, spreadLines, startsFromTaps, stepsDone } from '../../model/setup'
import { NUDGE_STEPS, formatTime, spanOf, tapToMediaTime } from '../../model/timing'
import { media, newMediaId } from '../../storage/media'
import { DEFAULT_HOLIDAY_MINUTES, DEFAULT_SCHOOL_MINUTES, REQUIRED_WIZARD_STEPS, WIZARD_STEPS, type Marks, type Section, type WizardStep } from '../../storage/schema'
import { store } from '../../storage/store'
import { button, filePick } from '../../ui/components'
import { h } from '../../ui/dom'
import { referencePlayer } from '../../ui/video'
import { field, grownScreen, savedNote } from './common'
import { askPersistenceOnce } from './plan'

const STEPS: Record<WizardStep, { title: string; about: string }> = {
  track: { title: 'Her track', about: 'The showcase music with the vocals removed, from Files on this iPad. About a minute.' },
  lines: { title: 'Her lines', about: 'Paste all her lines into one box. About 3 minutes.' },
  starts: { title: 'Where each section starts', about: 'Play her track once and tap as each section starts. About 3 minutes.' },
  follow: { title: 'The mirrored follow-along', about: 'The same again on the mirrored follow-along video, so her dance steps start at each section. Optional.' },
  timing: { title: 'Line timing', about: 'Her lines are spread evenly through each section as a first guess. Tap along to make them exact. Optional.' },
  beat: { title: 'The beat', about: 'Worked out from her track. Check it against a click. Optional.' },
  dates: { title: 'Dates, minutes and her walk-on time', about: 'For a plan counted back from the show, and the countdown before filming. Optional.' },
}

const NUDGE_LABEL = (d: number) => `${d < 0 ? 'Earlier' : 'Later'} by ${Math.abs(d)} seconds`
const sectionChips = STANDARD_SECTIONS

export const setupWizard: Screen = (root, { query }) => {
  const asked = query.get('step') as WizardStep | null
  const firstOpen = () => WIZARD_STEPS.find((s) => !stepsDone(save()).includes(s)) ?? null
  let open: WizardStep | null = asked && WIZARD_STEPS.includes(asked) ? asked : (save().wizard.at && !stepsDone(save()).includes(save().wizard.at!) ? save().wizard.at : firstOpen())
  /** Media this screen started, stopped when it changes step or closes. */
  let cleanup: (() => void)[] = []
  const stopAll = () => {
    for (const f of cleanup.splice(0)) f()
  }

  const list = h('div', { class: 'wizard stack' })
  const el = grownScreen(
    root,
    'grownups-setup',
    'Set up',
    '/grownups',
    h('p', { class: 'note' }, 'About 10 minutes. The first three steps are all she needs; the rest can wait. Leave at any time: it picks up where you stopped.'),
    list,
  )
  el.append(h('div', { class: 'row' }, button('Back to practice', () => go(save().setup.complete ? '/today' : '/welcome'), { variant: 'primary' })))

  function markDone(step: WizardStep, next = true): void {
    update((d) => {
      if (!d.wizard.done.includes(step)) d.wizard.done.push(step)
      if (setupUsable(d)) d.setup.complete = true
    })
    store().flush()
    if (save().setup.complete) void askPersistenceOnce()
    if (next) openStep(WIZARD_STEPS.find((s) => !stepsDone(save()).includes(s)) ?? null)
    else draw()
  }

  function openStep(step: WizardStep | null): void {
    stopAll()
    open = step
    update((d) => (d.wizard.at = step))
    draw()
  }

  function draw(): void {
    stopAll()
    const done = stepsDone(save())
    list.replaceChildren(
      ...WIZARD_STEPS.map((s, i) => {
        const isOpen = s === open
        const required = REQUIRED_WIZARD_STEPS.includes(s)
        const status = done.includes(s) ? 'Done' : required ? 'Needed' : 'Optional'
        const head = button([h('span', { class: 'wizard-step__n' }, String(i + 1)), h('span', { class: 'wizard-step__title' }, STEPS[s].title), h('span', { class: 'wizard-step__status' }, status)], () => openStep(isOpen ? null : s), { class: 'wizard-step__head' })
        const card = h('section', { class: `wizard-step card${done.includes(s) ? ' is-done' : ''}${isOpen ? ' is-open' : ''}`, 'data-step': s, 'data-required': required ? 'true' : 'false' }, head)
        if (isOpen) card.append(h('p', { class: 'note' }, STEPS[s].about), BODIES[s]())
        return card
      }),
    )
  }

  // ---- 1. Her track ---------------------------------------------------------------------------
  function trackBody(): HTMLElement {
    const t = save().track
    const status = h('div', { class: 'form-status' })
    const pick = filePick('Choose her track from Files', 'track', 'audio/*,video/*,.m4a,.mp3,.wav,.aac,.mp4', async (f) => {
      status.replaceChildren(h('p', { class: 'note' }, 'Loading…'))
      try {
        const db = await media()
        const id = newMediaId('track')
        await db.put({ id, kind: 'track', name: f.name, type: f.type || 'audio/mp4', size: f.size, createdAt: Date.now(), group: '', blob: f })
        const duration = await probeDuration(f)
        const old = save().track.mediaId
        update((d) => {
          d.track.mediaId = id
          d.track.fileName = f.name
          d.track.duration = duration
        })
        unloadTrack()
        if (old && old !== id) await db.delete(old)
        // The beat, worked out in the background: a first guess until a grown-up checks it.
        void detectFromBlob(f).then((g) => {
          if (!g) return
          update((d) => {
            if (!d.wizard.done.includes('beat')) d.tempo = { bpm: g.bpm, offset: g.offset }
          })
          if (open === 'beat') draw()
        })
        markDone('track')
      } catch (err) {
        console.warn('[solostudio] track load failed', err)
        status.replaceChildren(h('p', { class: 'import-error' }, 'That file could not be stored. Try an .m4a or .mp3 file.'))
      }
    })
    return h('div', { class: 'stack' }, h('p', { class: 'track-file' }, t.mediaId ? `${t.fileName}${t.duration ? ` (${formatTime(t.duration)})` : ''}` : 'No track loaded yet.'), h('div', { class: 'row' }, pick), status)
  }

  // ---- 2. Her lines ---------------------------------------------------------------------------
  function linesBody(): HTMLElement {
    const box = h('textarea', {
      name: 'songText',
      rows: 14,
      spellcheck: 'false',
      autocapitalize: 'off',
      placeholder: ['[Verse 1]', 'Line 1 of Verse 1', 'Line 2 of Verse 1', '= Meaning of Line 2 of Verse 1', '', '[Chorus]', 'Line 1 of Chorus', 'Line 2 of Chorus'].join('\n'),
    }) as HTMLTextAreaElement
    box.value = songText(sectionsInOrder())
    const insert = (name: string) => {
      const at = box.selectionStart ?? box.value.length
      const before = box.value.slice(0, at)
      const lead = before && !before.endsWith('\n') ? '\n' : ''
      const text = `${lead}[${name}]\n`
      box.value = before + text + box.value.slice(at)
      box.focus()
      box.setSelectionRange(at + text.length, at + text.length)
    }
    const custom = h('input', { name: 'customSection', type: 'text', placeholder: 'A custom name', autocomplete: 'off' }) as HTMLInputElement
    const status = h('div', { class: 'form-status' })
    return h(
      'div',
      { class: 'stack' },
      h('p', { class: 'note' }, 'Each section’s name goes in square brackets on its own line, with its lines under it. Under any line, a line starting with = is what it means (that marks a Korean line, written the way it sounds). Tap a name to add it where the cursor is.'),
      h('div', { class: 'section-chips row' }, ...sectionChips.map((n) => button(n, () => insert(n), { variant: 'chip' })), custom, button('Add this name', () => custom.value.trim() && insert(custom.value.trim()), { variant: 'quiet' })),
      box,
      status,
      h(
        'div',
        { class: 'row' },
        button('Save her lines', () => {
          const r = parseSongText(box.value)
          if (r.problems.length) return status.replaceChildren(...r.problems.map((p) => h('p', { class: 'import-error' }, p)))
          update((d) => (d.sections = applySongText(d, r.sections, new Date())))
          const count = r.sections.reduce((a, s) => a + s.lines.length, 0)
          status.replaceChildren(savedNote(`Saved: ${r.sections.length} sections, ${count} lines.`))
          if (count) markDone('lines')
        }, { variant: 'primary' }),
      ),
    )
  }

  // ---- 3 and 4. Tapping where each section starts (her track, or the follow-along) ---------------
  function tapper(opts: { player: Player; box: HTMLElement; playLabel: string; sections: Section[]; duration: () => number | null; save: (marks: Marks[]) => void; marks: () => Marks[] }): HTMLElement {
    const { player, sections } = opts
    const taps: number[] = []
    let complete = opts.marks().every((m) => m.start != null)
    const playBtn = button(opts.playLabel, () => {
      if (player.playing()) {
        player.pause()
        playBtn.textContent = opts.playLabel
      } else {
        player.play()
        playBtn.textContent = 'Pause'
      }
    }, { variant: 'primary' })
    const tapBox = h('div', { class: 'row tap-starts' })
    const rows = h('div', { class: 'stack start-rows' })
    const drawTap = () => {
      const next = complete ? undefined : sections[taps.length]
      tapBox.replaceChildren(
        next
          ? button(`${next.name} starts now`, () => {
              taps.push(Math.max(0, tapToMediaTime(player.time(), player.rate())))
              if (taps.length === sections.length) {
                complete = true
                opts.save(startsFromTaps(taps, opts.duration()))
                player.pause()
                playBtn.textContent = opts.playLabel
              }
              drawTap()
            }, { class: 'tap-big', variant: 'primary' })
          : button('Tap them again', () => {
              taps.length = 0
              complete = false
              player.seek(0)
              drawTap()
            }, { variant: 'quiet' }),
      )
      drawRows()
    }
    const drawRows = () => {
      const marks = opts.marks()
      rows.replaceChildren(
        ...sections.map((s, i) => {
          const m = marks[i]
          if (m?.start == null) return h('p', { class: 'note start-row', 'data-section': s.id }, `${s.name}: not tapped yet`)
          return h(
            'div',
            { class: 'row start-row', 'data-section': s.id },
            h('span', { class: 'start-row__name' }, `${s.name} ${formatTime(m.start)}`),
            ...NUDGE_STEPS.map((d) =>
              button(`${d > 0 ? '+' : '−'}${Math.abs(d)}`, () => {
                opts.save(nudgeStart(opts.marks(), i, d, opts.duration()))
                drawRows()
              }, { variant: 'quiet', label: NUDGE_LABEL(d) }),
            ),
            button('Hear it', () => {
              player.seek(Math.max(0, m.start! - 1))
              player.play()
              playBtn.textContent = 'Pause'
            }, { variant: 'quiet', label: `Hear where ${s.name} starts` }),
          )
        }),
      )
    }
    drawTap()
    return h('div', { class: 'stack' }, opts.box, h('div', { class: 'row' }, playBtn), tapBox, rows)
  }

  function startsBody(): HTMLElement {
    const d = save()
    if (!d.track.mediaId) return h('p', { class: 'note' }, 'Load her track first (step 1).')
    const sections = sectionsInOrder()
    if (!sections.length) return h('p', { class: 'note' }, 'Add her lines first (step 2).')
    const box = h('div', { class: 'player-area' })
    const player = trackPlayer(d.track.mediaId)
    cleanup.push(() => player.destroy())
    const ids = sections.map((s) => s.id)
    return tapper({
      player,
      box,
      playLabel: 'Play her track',
      sections,
      duration: () => save().track.duration ?? player.duration(),
      marks: () => ids.map((id) => save().sections.find((s) => s.id === id)?.track ?? { start: null, end: null }),
      save: (marks) => {
        update((s) => {
          ids.forEach((id, i) => {
            const sec = s.sections.find((x) => x.id === id)
            if (!sec) return
            sec.track = marks[i]
            // Line timing: a first guess, evenly through the section, until it is tapped along.
            const span = spanOf(sec.track)
            const untimed = sec.lines.some((l) => l.time == null) || sec.lines.some((l) => span && (l.time! < span.start - 0.01 || l.time! > span.end + 0.01))
            if (span && untimed) spreadLines(sec.lines.length, span).forEach((t, k) => (sec.lines[k].time = t))
          })
        })
        if (marks.every((m) => m.start != null)) markDone('starts', false)
      },
    })
  }

  function followBody(): HTMLElement {
    const ref = save().refs.find((r) => r.role === 'mirrored' && (r.kind === 'youtube' ? !!r.youtubeId : !!r.mediaId)) ?? save().refs.find((r) => r.kind === 'local' && r.mirror && r.mediaId)
    if (!ref) return h('p', { class: 'note' }, 'There is no mirrored follow-along video. Add one in Videos.')
    const sections = sectionsInOrder()
    if (!sections.length) return h('p', { class: 'note' }, 'Add her lines first (step 2).')
    const box = h('div', { class: 'player-area' })
    const player = referencePlayer(box, ref)
    cleanup.push(() => player.destroy())
    const ids = sections.map((s) => s.id)
    return h(
      'div',
      { class: 'stack' },
      tapper({
        player,
        box,
        playLabel: 'Play the video',
        sections,
        duration: () => player.duration(),
        marks: () => ids.map((id) => save().sections.find((s) => s.id === id)?.refs[ref.id] ?? { start: null, end: null }),
        save: (marks) => {
          update((s) => ids.forEach((id, i) => {
            const sec = s.sections.find((x) => x.id === id)
            if (sec) sec.refs[ref.id] = marks[i]
          }))
          if (marks.every((m) => m.start != null)) markDone('follow', false)
        },
      }),
      h('div', { class: 'row' }, button('Skip this for now', () => openStep('timing'), { variant: 'quiet' })),
    )
  }

  // ---- 5. Line timing ----------------------------------------------------------------------------
  function timingBody(): HTMLElement {
    const sections = sectionsInOrder().filter((s) => s.lines.length)
    return h(
      'div',
      { class: 'stack' },
      h('p', null, 'For lines that light up exactly with her rap, tap along once for each section (in Sections). Until then they are spread evenly, which is fine to start with.'),
      ...sections.map((s) => h('div', { class: 'row' }, h('span', null, s.name), button('Tap along', () => go(`/grownups/section/${s.id}`), { variant: 'quiet', label: `Tap along: ${s.name}` }))),
      h('div', { class: 'row' }, button('Keep the even spread for now', () => markDone('timing'), { variant: 'primary' })),
    )
  }

  // ---- 6. The beat --------------------------------------------------------------------------------
  function beatBody(): HTMLElement {
    const d = save()
    if (!d.track.mediaId) return h('p', { class: 'note' }, 'Load her track first (step 1); the beat is worked out from it.')
    const wrap = h('div', { class: 'stack' })
    let t = d.tempo.bpm && d.tempo.offset != null ? { bpm: d.tempo.bpm, offset: d.tempo.offset } : null
    const player = trackPlayer(d.track.mediaId)
    let ticker = 0
    const stopClick = () => {
      window.cancelAnimationFrame(ticker)
      player.pause()
    }
    cleanup.push(() => {
      stopClick()
      player.destroy()
    })
    const show = () => {
      if (!t) {
        wrap.replaceChildren(
          h('p', null, 'Working out the beat from her track…'),
          h('p', { class: 'note' }, 'If nothing comes up, the tempo can be tapped by hand in Tempo and counts.'),
        )
        return
      }
      const cur = t
      const playBtn = button('Play with a click', () => {
        if (player.playing()) {
          stopClick()
          playBtn.textContent = 'Play with a click'
          return
        }
        const from = Math.max(0, cur.offset - 1)
        player.seek(from)
        player.setRate(1)
        player.play()
        playBtn.textContent = 'Stop'
        let last = from
        const loop = () => {
          const now = player.time()
          if (t) for (const c of clickTimes(t, last, now)) if (c.at > last) click(c.one)
          last = now
          if (player.playing()) ticker = window.requestAnimationFrame(loop)
        }
        ticker = window.requestAnimationFrame(loop)
      }, { variant: 'primary' })
      const set = (next: { bpm: number; offset: number }) => {
        t = { bpm: Math.round(next.bpm * 10) / 10, offset: Math.max(0, Math.round(next.offset * 1000) / 1000) }
        const playing = player.playing()
        stopClick()
        show()
        if (playing) (wrap.querySelector('button.btn--primary') as HTMLButtonElement | null)?.click()
      }
      wrap.replaceChildren(
        h('p', { class: 'beat-line' }, h('span', { class: 'beat-bpm' }, String(Math.round(cur.bpm))), ' beats a minute, the first 1 at ', h('span', { class: 'beat-one' }, formatTime(cur.offset))),
        h('p', { class: 'note' }, 'Play it: the high click should land on each 1 and the low clicks on the beats in between. If it is twice as fast or slow, use Half or Double; if the 1 is off, move it.'),
        h('div', { class: 'row' }, playBtn),
        h(
          'div',
          { class: 'row' },
          button('Half', () => set(halfTempo(cur)), { variant: 'quiet' }),
          button('Double', () => set(doubleTempo(cur)), { variant: 'quiet' }),
          button('The 1 is earlier', () => set(nudgeOffset(cur, -0.05)), { variant: 'quiet' }),
          button('The 1 is later', () => set(nudgeOffset(cur, 0.05)), { variant: 'quiet' }),
        ),
        h(
          'div',
          { class: 'row' },
          button('That’s the beat', () => {
            const ok = t
            stopClick()
            if (!ok) return
            update((s) => (s.tempo = { bpm: ok.bpm, offset: ok.offset }))
            markDone('beat')
          }, { variant: 'primary' }),
        ),
      )
    }
    show()
    if (!t) {
      void (async () => {
        const rec = await (await media()).get(d.track.mediaId!)
        const g = rec ? await detectFromBlob(rec.blob) : null
        if (g) {
          t = { bpm: g.bpm, offset: g.offset }
          update((s) => (s.tempo = { bpm: g.bpm, offset: g.offset }))
          if (open === 'beat') show()
        } else wrap.replaceChildren(h('p', null, 'The beat couldn’t be worked out from this track. Tap it by hand in Tempo and counts instead.'))
      })()
    }
    return wrap
  }

  // ---- 7. Dates, minutes and her walk-on time --------------------------------------------------------
  function datesBody(): HTMLElement {
    const d = save()
    const input = (name: string, value: string, type = 'text', extra: Record<string, string | number> = {}) => h('input', { name, type, value, autocomplete: 'off', ...extra }) as HTMLInputElement
    const performerName = input('performerName', d.profile.name)
    const showName = input('showName', d.show?.name ?? '')
    const showDate = input('showDate', d.show?.date ?? '', 'date')
    const holidayStart = input('holidayStart', d.plan?.holidayStart ?? '', 'date')
    const holidayEnd = input('holidayEnd', d.plan?.holidayEnd ?? '', 'date')
    const schoolMinutes = input('schoolMinutes', String(d.plan?.schoolMinutes ?? DEFAULT_SCHOOL_MINUTES), 'number', { min: 15, max: 180, step: 5, inputmode: 'numeric' })
    const holidayMinutes = input('holidayMinutes', String(d.plan?.holidayMinutes ?? DEFAULT_HOLIDAY_MINUTES), 'number', { min: 15, max: 240, step: 5, inputmode: 'numeric' })
    const walkOn = input('walkOnSeconds', String(d.showtime.walkOnSeconds), 'number', { min: 3, max: 30, step: 1, inputmode: 'numeric' })
    const status = h('div', { class: 'form-status' })
    return h(
      'div',
      { class: 'stack' },
      h(
        'div',
        { class: 'form-grid' },
        field('Her name (shown as “Hi, …!”)', performerName),
        field('Show name', showName, 'For example: Showcase'),
        field('Show date', showDate),
        field('Holidays start', holidayStart, 'Leave empty if there are none before the show.'),
        field('Holidays end (optional)', holidayEnd),
        field('Minutes on a school day', schoolMinutes),
        field('Minutes on a holiday', holidayMinutes),
        field('Her walk-on time (seconds)', walkOn, 'From the iPad to her spot: the countdown before filming and Showtime’s walk-on.'),
      ),
      status,
      h(
        'div',
        { class: 'row' },
        button('Save dates', () => {
          const date = showDate.value
          const minutes = (el: HTMLInputElement, def: number) => Math.min(240, Math.max(15, Math.round(Number(el.value) || def)))
          const walk = Math.min(30, Math.max(3, Math.round(Number(walkOn.value) || 5)))
          update((s) => {
            s.profile.name = performerName.value.trim()
            s.showtime.walkOnSeconds = walk
            if (isDayKey(date)) {
              s.show = { name: showName.value.trim() || 'the show', date }
              s.plan = {
                startDate: s.plan?.startDate && s.plan.startDate <= today() ? s.plan.startDate : today(),
                holidayStart: isDayKey(holidayStart.value) ? holidayStart.value : null,
                holidayEnd: isDayKey(holidayEnd.value) ? holidayEnd.value : null,
                schoolMinutes: minutes(schoolMinutes, DEFAULT_SCHOOL_MINUTES),
                holidayMinutes: minutes(holidayMinutes, DEFAULT_HOLIDAY_MINUTES),
                lightWeekday: s.plan?.lightWeekday ?? 6,
              }
            }
          })
          status.replaceChildren(savedNote(isDayKey(date) ? 'Saved. Today’s plan counts back from the show.' : 'Saved. Add a show date any time for a plan counted back from it.'))
          markDone('dates', false)
        }, { variant: 'primary' }),
      ),
    )
  }

  const BODIES: Record<WizardStep, () => HTMLElement> = { track: trackBody, lines: linesBody, starts: startsBody, follow: followBody, timing: timingBody, beat: beatBody, dates: datesBody }

  // Every part of the wizard's own players goes when it closes.
  if (open) update((d) => (d.wizard.at = open))
  draw()
  return () => stopAll()
}

/** The grown-ups' home button for the wizard. */
export function setupButtonLabel(): string {
  const d = save()
  const done = stepsDone(d)
  if (!done.length) return 'Set up (about 10 minutes)'
  if (done.length < WIZARD_STEPS.length) return 'Carry on setting up'
  return 'Set up: check or change'
}

