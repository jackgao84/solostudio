/**
 * Sections: a grown-up names each part, types its lines (Korean lines in English letters by sound,
 * with an optional meaning line), marks where it starts and ends on her track and on each video by
 * tapping while it plays (with fine nudges), and times each line with tap-along.
 */
import { go, save, sectionById, sectionsInOrder, update } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { TAP_DEBOUNCE_MS, recordLineTap, wordsOf } from '../../model/sync'
import { NUDGE_STEPS, formatTime, markEnd, markStart, nudge, playRange, spanOf, tapToMediaTime } from '../../model/timing'
import { RangePlayer, type Player } from '../../media/player'
import type { Line, Marks, Section } from '../../storage/schema'
import { button, confirmButton } from '../../ui/components'
import { h } from '../../ui/dom'
import { referencePlayer, trackSource } from '../../ui/video'
import { field, grownScreen } from './common'

const rid = (p: string) => `${p}-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}`

export const sectionsAdmin: Screen = (root) => {
  const name = h('input', { name: 'sectionName', type: 'text', placeholder: 'For example: Verse 1', autocomplete: 'off' })
  const add = h(
    'form',
    { class: 'card stack' },
    h('p', { class: 'note' }, 'Add each part of the song (for example Intro, Verse 1, Chorus, Dance Break), then open it to type its lines and mark it. They appear in song order once marked on her track.'),
    field('New section', name),
    h('div', { class: 'row' }, button('Add section', () => undefined, { type: 'submit', variant: 'primary' })),
  )
  add.addEventListener('submit', (e) => {
    e.preventDefault()
    const n = name.value.trim()
    if (!n) return
    const id = rid('sec')
    update((d) => d.sections.push({ id, name: n, lines: [], track: { start: null, end: null }, refs: {}, createdAt: new Date().toISOString() }))
    go(`/grownups/section/${id}`)
  })
  const rows = sectionsInOrder().map((s) => {
    const span = spanOf(s.track)
    return h(
      'div',
      { class: 'card row gu-section-row' },
      h('div', { class: 'stack', style: 'flex:1;gap:2px' }, h('strong', null, s.name), h('span', { class: 'note' }, `${s.lines.length} lines · ${span ? `${formatTime(span.start)} to ${formatTime(span.end)} on her track` : 'not marked on her track yet'} · ${Object.values(s.refs).filter((m) => spanOf(m)).length} videos marked`)),
      button('Edit', () => go(`/grownups/section/${s.id}`), { label: `Edit ${s.name}` }),
    )
  })
  grownScreen(root, 'grownups-sections', 'Sections', '/grownups', add, ...rows)
}

// ---------------------------------------------------------------------------------------------

export const sectionEditor: Screen = (root, { params }) => {
  const s0 = sectionById(params.id)
  if (!s0) {
    go('/grownups/sections')
    return
  }
  const sid = s0.id
  const sec = (): Section => sectionById(sid)!
  const edit = (fn: (s: Section) => void) => update((d) => fn(d.sections.find((x) => x.id === sid)!))
  const cleanups: (() => void)[] = []

  // ---- Name and lines -----------------------------------------------------------------------
  const nameInput = h('input', { name: 'name', type: 'text', value: s0.name, autocomplete: 'off' })
  nameInput.addEventListener('change', () => edit((s) => (s.name = nameInput.value.trim() || s.name)))

  const linesBox = h('div', { class: 'lines' })
  const lineRow = (line: Line, i: number): HTMLElement => {
    const lyric = h('textarea', { name: 'lyric', rows: 2, 'aria-label': `Line ${i + 1}` }) as HTMLTextAreaElement
    lyric.value = line.lyric
    lyric.addEventListener('change', () =>
      edit((s) => {
        const l = s.lines[i]
        l.lyric = lyric.value.trim()
        const n = wordsOf(l.lyric).length
        l.breaths = l.breaths.filter((b) => b < n - 1)
      }),
    )
    const lang = h('select', { name: 'lang', 'aria-label': `Language of line ${i + 1}` }, h('option', { value: 'en', selected: line.lang === 'en' }, 'English'), h('option', { value: 'ko', selected: line.lang === 'ko' }, 'Korean (by sound)'))
    lang.addEventListener('change', () => edit((s) => (s.lines[i].lang = lang.value === 'ko' ? 'ko' : 'en')))
    const meaning = h('input', { name: 'meaning', type: 'text', value: line.meaning, placeholder: 'Meaning (optional)', 'aria-label': `Meaning of line ${i + 1}`, autocomplete: 'off' })
    meaning.addEventListener('change', () => edit((s) => (s.lines[i].meaning = meaning.value.trim())))
    const move = (dir: -1 | 1) => {
      edit((s) => {
        const j = i + dir
        if (j < 0 || j >= s.lines.length) return
        ;[s.lines[i], s.lines[j]] = [s.lines[j], s.lines[i]]
      })
      drawLines()
    }
    return h(
      'div',
      { class: 'line-row' },
      lyric,
      h(
        'div',
        { class: 'line-row__bar' },
        lang,
        meaning,
        h('span', { class: 'note line-time' }, line.time == null ? 'not timed' : formatTime(line.time)),
        button('↑', () => move(-1), { label: `Move line ${i + 1} up` }),
        button('↓', () => move(1), { label: `Move line ${i + 1} down` }),
        confirmButton('Remove', 'Yes, remove', () => {
          edit((s) => s.lines.splice(i, 1))
          drawLines()
        }),
      ),
    )
  }
  const drawLines = () => linesBox.replaceChildren(...sec().lines.map(lineRow))
  drawLines()

  const bulk = h('textarea', { name: 'bulkLines', rows: 5, placeholder: 'Type or paste the lines here, one per line.' }) as HTMLTextAreaElement
  const addLines = button('Add these lines', () => {
    const lines = bulk.value
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean)
    if (!lines.length) return
    edit((s) => {
      for (const lyric of lines) s.lines.push({ id: rid('line'), lyric, lang: 'en', meaning: '', breaths: [], time: null })
    })
    bulk.value = ''
    drawLines()
  })

  // ---- Marks: tap while it plays, then nudge --------------------------------------------------
  const sourceSelect = h('select', { name: 'markSource', 'aria-label': 'Mark this section on' }, h('option', { value: 'track' }, 'Her track'), ...save().refs.map((r) => h('option', { value: r.id }, r.label || r.fileName)))
  const markSpeed = h('select', { name: 'markSpeed', 'aria-label': 'Speed while marking' }, ...[1, 0.75, 0.5].map((r) => h('option', { value: r }, `${r * 100}%`)))
  const marksBox = h('div', { class: 'marks-box' })
  let markPlayer: Player | null = null
  let checkRange: RangePlayer | null = null

  const getMarks = (source: string): Marks => (source === 'track' ? sec().track : (sec().refs[source] ?? { start: null, end: null }))
  const setMarks = (source: string, m: Marks) =>
    edit((s) => {
      if (source === 'track') s.track = m
      else s.refs[source] = m
    })

  async function showMarks(source: string): Promise<void> {
    checkRange?.destroy()
    checkRange = null
    markPlayer?.destroy()
    markPlayer = null
    const panel = h('div', { class: 'marks card', 'data-source': source })
    const box = h('div', { class: 'player-area' })
    const times = h('div', { class: 'mark-times' })
    const playBtn = button('Play', () => {
      if (!markPlayer) return
      if (markPlayer.playing()) {
        markPlayer.pause()
        playBtn.textContent = 'Play'
      } else {
        markPlayer.setRate(Number(markSpeed.value) || 1)
        markPlayer.play()
        playBtn.textContent = 'Pause'
      }
    }, { variant: 'primary' })
    const showTimes = () => {
      const m = getMarks(source)
      times.replaceChildren(h('span', { class: 'mark-start' }, `Start ${m.start == null ? '–' : formatTime(m.start)}`), h('span', { class: 'mark-end' }, `End ${m.end == null ? '–' : formatTime(m.end)}`))
    }
    const mark = (which: 'start' | 'end') => {
      if (!markPlayer) return
      const t = tapToMediaTime(markPlayer.time(), markPlayer.playing() ? markPlayer.rate() : 0)
      const m = getMarks(source)
      setMarks(source, which === 'start' ? markStart(m, t, markPlayer.duration()) : markEnd(m, t, markPlayer.duration()))
      showTimes()
    }
    const nudges = (which: 'start' | 'end') =>
      h(
        'div',
        { class: 'nudges' },
        h('span', null, which === 'start' ? 'Start' : 'End'),
        ...NUDGE_STEPS.map((step) =>
          button(`${step > 0 ? '+' : '−'}${Math.abs(step)}`, () => {
            setMarks(source, nudge(getMarks(source), which, step, markPlayer?.duration() ?? null))
            showTimes()
          }, { label: `Move ${which} ${step > 0 ? 'later' : 'earlier'} by ${Math.abs(step)} seconds`, variant: 'quiet' }),
        ),
      )
    const hear = button('Hear this section', () => {
      const span = spanOf(getMarks(source))
      if (!markPlayer || !span) return
      checkRange?.destroy()
      checkRange = new RangePlayer(markPlayer, playRange(span).from, span.end, Number(markSpeed.value) || 1)
      checkRange.onStop = () => (playBtn.textContent = 'Play')
      void checkRange.playFromTop().then((ok) => (playBtn.textContent = ok ? 'Pause' : 'Play'))
    })
    showTimes()
    panel.append(
      box,
      h('p', { class: 'note' }, 'Tap Play, then tap Mark start as the section begins and Mark end as it finishes. Fine-tune with the nudges.'),
      h('div', { class: 'row' }, playBtn, button('Mark start', () => mark('start')), button('Mark end', () => mark('end')), field('Speed', markSpeed)),
      times,
      nudges('start'),
      nudges('end'),
      h('div', { class: 'row' }, hear),
    )
    marksBox.replaceChildren(panel)
    if (source === 'track') {
      const src = await trackSource(box, save())
      if (!src) box.append(h('p', { class: 'note' }, 'Load her track first (Her track), or set a stand-in video there.'))
      else markPlayer = src.player
    } else {
      const ref = save().refs.find((r) => r.id === source)
      if (ref) markPlayer = referencePlayer(box, ref)
    }
  }
  sourceSelect.addEventListener('change', () => void showMarks(sourceSelect.value))
  cleanups.push(() => {
    checkRange?.destroy()
    markPlayer?.destroy()
  })

  // ---- Tap-along on her track -----------------------------------------------------------------
  const tapSpeed = h('select', { name: 'tapSpeed', 'aria-label': 'Tap-along speed' }, ...[0.5, 0.75, 1].map((r) => h('option', { value: r, selected: r === 0.75 }, `${r * 100}%`)))
  const tapBox = h('div', { class: 'tapalong-body stack' })
  const tapArea = h('div', { class: 'player-area' })
  let tapPlayer: Player | null = null
  let tapRange: RangePlayer | null = null
  const stopTap = () => {
    tapRange?.destroy()
    tapRange = null
    tapPlayer?.destroy()
    tapPlayer = null
    tapArea.replaceChildren()
  }
  cleanups.push(stopTap)
  const startTap = async () => {
    stopTap()
    const lines = sec().lines
    if (!lines.length) return tapBox.replaceChildren(h('p', { class: 'note' }, 'Add the lines first.'))
    const src = await trackSource(tapArea, save())
    if (!src) return tapBox.replaceChildren(h('p', { class: 'note' }, 'Load her track first.'))
    tapPlayer = src.player
    const span = spanOf(sec().track)
    const speed = Number(tapSpeed.value) || 0.75
    tapRange = new RangePlayer(tapPlayer, span ? playRange(span).from : 0, Infinity, speed)
    let idx = 0
    let times = lines.map((l) => l.time)
    const nextText = h('p', { class: 'tap-line' })
    const msg = h('p', { class: 'note' })
    const showNext = () => (nextText.textContent = `Next: line ${idx + 1} of ${lines.length}: ${lines[idx].lyric}`)
    showNext()
    let lastTap = 0
    const next = button('Next line', () => {
      if (!tapPlayer || idx >= lines.length) return
      if (performance.now() - lastTap < TAP_DEBOUNCE_MS) return
      lastTap = performance.now()
      const out = recordLineTap(times, idx, tapPlayer.time(), tapPlayer.rate())
      if (!out) return void (msg.textContent = 'Too soon after the line before: tap as the line starts.')
      msg.textContent = ''
      times = out
      edit((s) => s.lines.forEach((l, k) => (l.time = times[k] ?? null)))
      idx++
      if (idx >= lines.length) {
        tapRange?.pause()
        tapBox.replaceChildren(h('p', { class: 'tapalong-done saved-note' }, 'All lines are timed. Open her practice screen to see them light up.'), button('Tap-along again', () => void startTap()))
        drawLines()
        return
      }
      showNext()
    }, { variant: 'primary', class: 'tap-big' })
    const undo = button('Undo', () => {
      if (idx === 0) return
      idx--
      times = times.map((t, k) => (k >= idx ? null : t))
      edit((s) => s.lines.forEach((l, k) => (l.time = times[k] ?? null)))
      showNext()
    })
    const starting = h('p', { class: 'note' }, 'Starting her track…')
    tapBox.replaceChildren(tapArea, starting)
    if (!(await tapRange.playFromTop())) return void (starting.textContent = 'Her track could not play.')
    // Offer "Next line" only once the music is really moving, so taps match what she hears.
    const from = tapPlayer.time()
    for (let i = 0; i < 60 && tapPlayer && tapPlayer.time() <= from + 0.02; i++) await new Promise((r) => setTimeout(r, 50))
    if (!tapPlayer) return
    tapBox.replaceChildren(tapArea, nextText, next, msg, h('div', { class: 'row' }, undo, button('Stop', () => (stopTap(), tapBox.replaceChildren()))))
  }

  const remove = confirmButton('Remove this section', 'Yes, remove it', () => {
    update((d) => {
      d.sections = d.sections.filter((s) => s.id !== sid)
      delete d.progress[sid]
    })
    go('/grownups/sections')
  })

  grownScreen(
    root,
    'grownups-section',
    s0.name,
    '/grownups/sections',
    h('section', { class: 'card stack' }, field('Section name', nameInput)),
    h(
      'section',
      { class: 'card stack' },
      h('h2', null, 'Lines'),
      h('p', { class: 'note' }, 'Type the lines on this iPad; they stay here. Write Korean lines in English letters, the way they sound, and add a meaning line if it helps.'),
      linesBox,
      field('Add lines', bulk),
      h('div', { class: 'row' }, addLines),
    ),
    h('section', { class: 'card stack' }, h('h2', null, 'Mark where it starts and ends'), field('Mark it on', sourceSelect), marksBox),
    h(
      'section',
      { class: 'card tapalong' },
      h('h2', null, 'Tap-along'),
      h('p', { class: 'note' }, 'Her track plays from just before this section. Tap Next line as each line starts. Lines then light up at any speed.'),
      h('div', { class: 'row' }, field('Speed', tapSpeed), button('Start tap-along', () => void startTap())),
      tapBox,
    ),
    h('div', { class: 'row' }, remove),
  )
  void showMarks('track')
  return () => cleanups.forEach((c) => c())
}
