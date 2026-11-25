/**
 * Shared end-to-end helpers.
 *
 * - `test` fails on any console error, page error or off-site request, and installs stand-ins:
 *   YouTube (the IFrame Player API script and the youtube-nocookie.com embed are served locally by a
 *   fake that keeps its own clock and records speeds), the front camera (an animated canvas stream),
 *   the screen wake lock and navigator.storage.persist() (both recorded).
 * - Touch taps, the grown-ups' press-and-hold, typing placeholder lines (never real lyrics).
 * - Per-screen checks: 48 px targets, no sideways scroll, 16 px inputs, text readable from two metres
 *   on her screens, and the YouTube rules.
 * - Seeded saves built from placeholders, and generated media (a WAV track, a recorded video).
 */
import { test as base, expect, type BrowserContext, type Locator, type Page, type TestInfo } from '@playwright/test'
import { GATE_HOLD_MS } from '../src/app/gate'
import { DEFAULT_REFS } from '../src/content/references'
import { addDays, dayKey, weekdayOf } from '../src/model/dates'
import { KEYS } from '../src/storage/keys'
import { defaultSave, type Line, type SaveData, type Section } from '../src/storage/schema'
import { isPlaceholder, lyricLine, meaningLine } from '../tests/fixtures/placeholders'

export { expect }

export const MIN_TARGET_PX = 48
/** Her screens are read from two metres away with the iPad on a stand. */
export const KID_MIN_FONT_PX = 22
export const GROWNUP_MIN_FONT_PX = 16
export const LYRIC_MIN_FONT_PX = 32
export const COUNT_MIN_FONT_PX = 40
export const TAP_GAP_MS = 250

export const today = (): string => dayKey(new Date())

// ---------------------------------------------------------------------------------------------
// Stand-ins

/** Served for https://www.youtube.com/iframe_api: a YT.Player with its own clock. */
export const YT_API_STUB = `(() => {
  const fake = (window.__ytFake = window.__ytFake || { players: [] })
  const RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
  function Player(el, opts) {
    const self = this
    const host = opts.host || 'https://www.youtube.com'
    const target = typeof el === 'string' ? document.getElementById(el) : el
    const iframe = document.createElement('iframe')
    const vars = Object.assign({}, opts.playerVars || {})
    const st = { videoId: opts.videoId, host, vars, rate: 1, playing: false, pos: 0, base: 0, rateCalls: [], seeks: [], destroyed: false, ready: false }
    fake.players.push(st)
    const src = (id) => {
      const q = new URLSearchParams()
      for (const k of Object.keys(vars)) q.set(k, String(vars[k]))
      q.set('enablejsapi', '1')
      return host + '/embed/' + id + '?' + q.toString()
    }
    iframe.src = src(opts.videoId)
    iframe.id = target.id || ''
    iframe.title = 'YouTube video player'
    iframe.setAttribute('width', String(opts.width || '100%'))
    iframe.setAttribute('height', String(opts.height || '100%'))
    iframe.setAttribute('frameborder', '0')
    iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture')
    target.parentNode.replaceChild(iframe, target)
    const now = () => (st.playing ? st.pos + ((performance.now() - st.base) / 1000) * st.rate : st.pos)
    const fire = (name, data) => {
      const cb = opts.events && opts.events[name]
      if (cb) setTimeout(() => cb({ target: self, data }), 0)
    }
    const check = () => {
      const code = (window.__ytFakeErrors || {})[st.videoId]
      if (code) setTimeout(() => fire('onError', code), 20)
    }
    self.getIframe = () => iframe
    self.playVideo = () => {
      if (st.destroyed || st.playing) return
      st.base = performance.now()
      st.playing = true
      fire('onStateChange', 1)
    }
    self.pauseVideo = () => {
      if (!st.playing) return
      st.pos = now()
      st.playing = false
      fire('onStateChange', 2)
    }
    self.stopVideo = () => self.pauseVideo()
    self.seekTo = (s) => {
      st.pos = Math.max(0, Number(s) || 0)
      st.base = performance.now()
      st.seeks.push(st.pos)
    }
    self.getCurrentTime = () => now()
    self.getDuration = () => 240
    self.setPlaybackRate = (r) => {
      st.pos = now()
      st.base = performance.now()
      st.rate = r
      st.rateCalls.push(r)
      fire('onPlaybackRateChange', r)
    }
    self.getPlaybackRate = () => st.rate
    self.getAvailablePlaybackRates = () => RATES.slice()
    self.getPlayerState = () => (st.playing ? 1 : 2)
    self.mute = () => {}
    self.unMute = () => {}
    self.isMuted = () => false
    self.setVolume = () => {}
    self.getVolume = () => 100
    const load = (a, play) => {
      const id = typeof a === 'string' ? a : a.videoId
      st.videoId = id
      st.pos = (a && typeof a === 'object' && a.startSeconds) || 0
      st.base = performance.now()
      st.playing = !!play
      iframe.src = src(id)
      check()
    }
    self.loadVideoById = (a) => load(a, true)
    self.cueVideoById = (a) => load(a, false)
    self.destroy = () => {
      st.destroyed = true
      st.playing = false
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
    }
    setTimeout(() => {
      st.ready = true
      fire('onReady')
      check()
    }, 30)
  }
  window.YT = { Player, PlayerState: { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 }, loaded: 1 }
  if (typeof window.onYouTubeIframeAPIReady === 'function') window.onYouTubeIframeAPIReady()
})()`

/** Runs before any page script: camera, wake lock and persist() stand-ins that record what happens. */
const INIT_STANDINS = () => {
  const w = window as unknown as Record<string, unknown>
  // Front camera: an animated canvas stream (video only).
  const camera = { requests: 0, stopped: 0, constraints: [] as unknown[] }
  w.__camera = camera
  const fakeGum = async (constraints: unknown): Promise<MediaStream> => {
    camera.requests++
    camera.constraints.push(constraints)
    const c = document.createElement('canvas')
    c.width = 320
    c.height = 240
    const g = c.getContext('2d')!
    let k = 0
    const draw = () => {
      g.fillStyle = `hsl(${(k * 9) % 360} 70% 45%)`
      g.fillRect(0, 0, 320, 240)
      g.fillStyle = '#ffffff'
      g.fillRect(20 + ((k * 4) % 260), 90, 40, 60)
      k++
    }
    draw()
    const timer = setInterval(draw, 50)
    const stream = c.captureStream(20)
    for (const t of stream.getTracks()) {
      const stop = t.stop.bind(t)
      t.stop = () => {
        camera.stopped++
        clearInterval(timer)
        stop()
      }
    }
    return stream
  }
  // On the prototype: Playwright's WebKit drops overrides set on the navigator.mediaDevices object
  // itself a couple of seconds after load.
  if (typeof MediaDevices !== 'undefined') MediaDevices.prototype.getUserMedia = fakeGum as MediaDevices['getUserMedia']
  else Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: fakeGum, enumerateDevices: async () => [] } })

  // Screen wake lock.
  const wake = { requests: 0, releases: 0, active: 0 }
  w.__wake = wake
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: {
      request: async (type: string) => {
        wake.requests++
        wake.active++
        const listeners: (() => void)[] = []
        const sentinel = {
          type,
          released: false,
          onrelease: null as null | (() => void),
          addEventListener: (_: string, cb: () => void) => listeners.push(cb),
          removeEventListener: () => undefined,
          release: async () => {
            if (sentinel.released) return
            sentinel.released = true
            wake.releases++
            wake.active--
            for (const cb of listeners) cb()
            sentinel.onrelease?.()
          },
        }
        return sentinel
      },
    },
  })

  // navigator.storage.persist().
  const persist = { calls: 0 }
  w.__persist = persist
  // On the prototype, for the same reason as the camera.
  if (typeof StorageManager !== 'undefined') {
    StorageManager.prototype.persist = async () => {
      persist.calls++
      return true
    }
    StorageManager.prototype.persisted = async () => persist.calls > 0
  }
}

/** Hosts the stand-ins answer for (never reached for real). */
const STANDIN_HOSTS = new Set(['www.youtube.com', 'www.youtube-nocookie.com'])

export async function installStandIns(context: BrowserContext): Promise<void> {
  await context.addInitScript(INIT_STANDINS)
  await context.route('https://www.youtube.com/iframe_api', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: YT_API_STUB }))
  await context.route('https://www.youtube-nocookie.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body style="margin:0;background:#202030"></body></html>' }),
  )
}

// ---------------------------------------------------------------------------------------------
// Fixtures: console errors, page errors and off-site requests fail the test

interface Watch {
  problems: string[]
}

function watch(context: BrowserContext, host: string): Watch {
  const w: Watch = { problems: [] }
  context.on('console', (msg) => {
    if (msg.type() === 'error') w.problems.push(`console.error: ${msg.text()}`)
  })
  context.on('weberror', (err) => w.problems.push(`page error: ${err.error().message}`))
  context.on('request', (req) => {
    const u = new URL(req.url())
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return
    if (u.host === host) return
    if (u.host === 'www.youtube.com' && u.pathname === '/iframe_api') return
    if (u.host === 'www.youtube-nocookie.com' && u.pathname.startsWith('/embed/')) return
    w.problems.push(`off-site request: ${req.url()}`)
  })
  return w
}

export interface Fixtures {
  /** Problems seen in this test's context; the test fails at the end if any are left. */
  problems: string[]
}

export const test = base.extend<Fixtures>({
  context: async ({ context }, use) => {
    await installStandIns(context)
    await use(context)
  },
  problems: [
    async ({ context, baseURL }, use, testInfo: TestInfo) => {
      const w = watch(context, new URL(baseURL ?? 'http://localhost:4174/').host)
      await use(w.problems)
      expect(w.problems, `console errors, page errors or off-site requests (${testInfo.title})`).toEqual([])
    },
    { auto: true },
  ],
})

export { STANDIN_HOSTS }

// ---------------------------------------------------------------------------------------------
// Touch

const lastTap = new WeakMap<Page, number>()

/** A real touch tap at a human pace. */
export async function tap(locator: Locator): Promise<void> {
  const page = locator.page()
  const since = Date.now() - (lastTap.get(page) ?? 0)
  if (since < TAP_GAP_MS) await page.waitForTimeout(TAP_GAP_MS - since)
  await locator.tap()
  lastTap.set(page, Date.now())
}

/** Pointer press on `locator` for `ms`, then release (touch). */
export async function press(locator: Locator, ms: number): Promise<void> {
  const box = await locator.boundingBox()
  if (!box) throw new Error('press: element not visible')
  const at = { clientX: box.x + box.width / 2, clientY: box.y + box.height / 2 }
  const init = { pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true, ...at }
  await locator.dispatchEvent('pointerdown', { ...init, button: 0, buttons: 1 })
  await locator.page().waitForTimeout(ms)
  // The hold may already have moved on to another screen.
  if (await locator.count()) await locator.dispatchEvent('pointerup', { ...init, button: 0, buttons: 0 }).catch(() => undefined)
}

/** The grown-ups' press-and-hold, all the way. */
export async function holdGate(page: Page): Promise<void> {
  const gate = page.locator('.gate-hold')
  await expect(gate).toBeVisible()
  await press(gate, GATE_HOLD_MS + 400)
  await expectRoute(page, '/grownups')
}

/** Tap a field and type into it (not for rap lines: use typeLyric / typeLines). */
export async function typeInto(field: Locator, text: string): Promise<void> {
  await tap(field)
  await field.fill(text)
  await field.dispatchEvent('change')
}

function placeholderOnly(text: string): string {
  if (!isPlaceholder(text)) throw new Error(`checks type placeholders only, never real lines: ${text}`)
  return text
}

/** Type one rap line (a placeholder such as "Line 3 of Verse 1"). */
export async function typeLyric(field: Locator, text: string): Promise<void> {
  await typeInto(field, placeholderOnly(text))
}

/** Type a meaning line (a placeholder such as "Meaning of Line 3 of Verse 1"). */
export async function typeMeaning(field: Locator, text: string): Promise<void> {
  await typeInto(field, placeholderOnly(text))
}

/** Type several rap lines, one per line (placeholders only). */
export async function typeLines(field: Locator, lines: string[]): Promise<void> {
  await typeInto(field, lines.map(placeholderOnly).join('\n'))
}

// ---------------------------------------------------------------------------------------------
// Reading the app

export function routeOf(page: Page): string {
  return new URL(page.url()).hash.replace(/^#/, '').split('?')[0] || '/'
}

export async function expectRoute(page: Page, path: string | RegExp): Promise<void> {
  if (typeof path === 'string') await expect.poll(() => routeOf(page), { message: `route should be ${path}` }).toBe(path)
  else await expect.poll(() => routeOf(page), { message: `route should match ${path}` }).toMatch(path)
}

interface DebugHook {
  save(): SaveData
  media(): Promise<{ id: string; kind: string; name: string; group: string; size: number; createdAt: number }[]>
}

declare global {
  interface Window {
    __solostudio?: DebugHook
  }
}

/** A deep copy of the save, through the app's read-only debug hook. */
export async function readSave(page: Page): Promise<SaveData> {
  await page.waitForFunction(() => !!window.__solostudio)
  return page.evaluate(() => window.__solostudio!.save())
}

/** Media records (no bytes) in IndexedDB. */
export async function readMedia(page: Page) {
  await page.waitForFunction(() => !!window.__solostudio)
  return page.evaluate(() => window.__solostudio!.media())
}

export interface FakePlayer {
  videoId: string
  host: string
  vars: Record<string, string | number>
  rate: number
  playing: boolean
  rateCalls: number[]
  destroyed: boolean
}

/** The YouTube stand-in players still on the page. */
export async function ytPlayers(page: Page): Promise<FakePlayer[]> {
  return page.evaluate(() => ((window as unknown as { __ytFake?: { players: FakePlayer[] } }).__ytFake?.players ?? []).filter((p) => !p.destroyed))
}

export async function wakeLock(page: Page): Promise<{ requests: number; releases: number; active: number }> {
  return page.evaluate(() => (window as unknown as { __wake: { requests: number; releases: number; active: number } }).__wake)
}

/** Her track's <audio> element. */
export async function trackAudio(page: Page): Promise<{ rate: number; preservesPitch: boolean; paused: boolean; time: number } | null> {
  return page.evaluate(() => {
    const a = document.querySelector<HTMLAudioElement>('audio.track-audio')
    if (!a) return null
    const pp = (a as unknown as { preservesPitch?: boolean; webkitPreservesPitch?: boolean }).preservesPitch ?? (a as unknown as { webkitPreservesPitch?: boolean }).webkitPreservesPitch ?? false
    return { rate: a.playbackRate, preservesPitch: pp, paused: a.paused, time: a.currentTime }
  })
}

/** Give transitions a moment to finish so sizes are measured at rest. */
export async function settle(page: Page, timeoutMs = 3000): Promise<void> {
  await page
    .waitForFunction(
      () =>
        document.getAnimations().every((a) => {
          const end = Number(a.effect?.getComputedTiming().endTime ?? Infinity)
          return a.playState !== 'running' || !Number.isFinite(end)
        }),
      undefined,
      { timeout: timeoutMs, polling: 100 },
    )
    .catch(() => undefined)
}

// ---------------------------------------------------------------------------------------------
// Per-screen checks

/** Every visible control is at least 48 × 48 CSS px. */
export async function assertTapTargets(page: Page, label: string): Promise<void> {
  const small = await page.evaluate((min) => {
    const out: string[] = []
    const sel = 'button, [role="button"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], a[href], input:not([type="hidden"]):not([type="file"]), select, textarea, summary, label.file-pick'
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      const b = el.getBoundingClientRect()
      if (b.width <= 1 || b.height <= 1) continue
      const st = getComputedStyle(el)
      if (st.visibility === 'hidden' || st.pointerEvents === 'none') continue
      if (el.closest('[aria-hidden="true"], [inert]')) continue
      if (b.width >= min - 0.5 && b.height >= min - 0.5) continue
      const name = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30)
      out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(/\s+/)[0]} "${name}" ${Math.round(b.width)}×${Math.round(b.height)}`)
    }
    return out
  }, MIN_TARGET_PX)
  expect(small, `tap targets under ${MIN_TARGET_PX} px on ${label}`).toEqual([])
}

/** No sideways scrolling. */
export async function assertNoHorizontalScroll(page: Page, label: string): Promise<void> {
  const r = await page.evaluate(() => {
    const doc = document.scrollingElement || document.documentElement
    const wide = Array.from(document.querySelectorAll<HTMLElement>('.screen')).filter((s) => s.scrollWidth > s.clientWidth + 1).map((s) => s.className)
    return { page: doc.scrollWidth, width: window.innerWidth, wide }
  })
  expect(r.page, `page scroll width on ${label}`).toBeLessThanOrEqual(r.width)
  expect(r.wide, `screens wider than the viewport on ${label}`).toEqual([])
}

/** Text fields use 16 px text or more, so Safari never zooms in. */
export async function assertInputsNoZoom(page: Page, label: string): Promise<void> {
  const small = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('input:not([type="hidden"]):not([type="file"]), textarea, select'))
      .filter((el) => el.getBoundingClientRect().width > 1 && parseFloat(getComputedStyle(el).fontSize) < 16)
      .map((el) => `${el.tagName.toLowerCase()}[name=${el.getAttribute('name') ?? ''}] ${getComputedStyle(el).fontSize}`),
  )
  expect(small, `text fields under 16 px on ${label}`).toEqual([])
}

/** Every piece of visible text is at least `min` px. */
export async function assertTextSize(page: Page, min: number, label: string): Promise<void> {
  const small = await page.evaluate((min) => {
    const out: string[] = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = (n.textContent ?? '').trim()
      if (!text) continue
      const el = n.parentElement
      if (!el || el.closest('[aria-hidden="true"], script, style, noscript, .sr-only')) continue
      const b = el.getBoundingClientRect()
      if (b.width <= 1 || b.height <= 1) continue
      const st = getComputedStyle(el)
      if (st.visibility === 'hidden' || st.display === 'none' || parseFloat(st.opacity) === 0) continue
      const px = parseFloat(st.fontSize)
      if (px < min - 0.01) out.push(`"${text.slice(0, 40)}" ${px}px`)
    }
    return out
  }, min)
  expect(small, `text under ${min} px on ${label}`).toEqual([])
}

/** All the per-screen checks for one of her screens or a grown-ups' screen. */
export async function checkScreen(page: Page, who: 'kid' | 'grownup', label: string): Promise<void> {
  await settle(page)
  await assertTapTargets(page, label)
  await assertNoHorizontalScroll(page, label)
  await assertInputsNoZoom(page, label)
  await assertTextSize(page, who === 'kid' ? KID_MIN_FONT_PX : GROWNUP_MIN_FONT_PX, label)
}

/**
 * The YouTube rules, for every YouTube player on screen: youtube-nocookie.com, plays inline, at
 * least 200 × 200, no CSS transform on it or anything around it, nothing drawn over it, and the
 * lyrics and counts beside it rather than on it.
 */
export async function assertYouTubeRules(page: Page, label: string): Promise<void> {
  const frames = page.locator('iframe')
  await expect(frames.first(), `a YouTube player on ${label}`).toBeVisible()
  const report = await page.evaluate(() => {
    const out: { src: string; w: number; h: number; transformed: string[]; covered: string[]; overlaps: string[] }[] = []
    for (const f of Array.from(document.querySelectorAll('iframe'))) {
      const r = f.getBoundingClientRect()
      const transformed: string[] = []
      for (let el: Element | null = f; el; el = el.parentElement) {
        const st = getComputedStyle(el)
        if (st.transform !== 'none' || st.filter !== 'none' || st.opacity !== '1') transformed.push(`${el.tagName.toLowerCase()}.${String((el as HTMLElement).className).split(' ')[0]}`)
      }
      const covered: string[] = []
      for (let i = 1; i <= 5; i++)
        for (let j = 1; j <= 5; j++) {
          const x = r.left + (r.width * i) / 6
          const y = r.top + (r.height * j) / 6
          if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue
          const top = document.elementFromPoint(x, y)
          if (top !== f) covered.push(`${Math.round(x)},${Math.round(y)}: ${top ? top.tagName.toLowerCase() + '.' + String((top as HTMLElement).className).split(' ')[0] : 'nothing'}`)
        }
      const overlaps: string[] = []
      for (const el of Array.from(document.querySelectorAll('.lyrics, .counts, .showtime-lyric'))) {
        const b = el.getBoundingClientRect()
        if (b.width < 1 || b.height < 1) continue
        if (b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top) overlaps.push(String((el as HTMLElement).className))
      }
      out.push({ src: f.src, w: r.width, h: r.height, transformed, covered, overlaps })
    }
    return out
  })
  for (const p of report) {
    const u = new URL(p.src)
    expect(u.host, `${label}: player host`).toBe('www.youtube-nocookie.com')
    expect(u.pathname, `${label}: embed path`).toMatch(/^\/embed\/[A-Za-z0-9_-]{11}$/)
    expect(u.searchParams.get('playsinline'), `${label}: playsinline`).toBe('1')
    expect(p.w, `${label}: player width`).toBeGreaterThanOrEqual(200)
    expect(p.h, `${label}: player height`).toBeGreaterThanOrEqual(200)
    expect(p.transformed, `${label}: transforms on or around the player`).toEqual([])
    expect(p.covered, `${label}: something drawn over the player`).toEqual([])
    expect(p.overlaps, `${label}: lyrics or counts on the player`).toEqual([])
  }
}

// ---------------------------------------------------------------------------------------------
// Seeded saves (placeholders only)

export const SECTION_NAMES = ['Verse 1', 'Chorus', 'Dance Break'] as const

function lines(sectionName: string, start: number): Line[] {
  return [1, 2, 3, 4].map((n, j) => ({
    id: `${sectionName.replace(/\W/g, '').toLowerCase()}-l${n}`,
    lyric: lyricLine(n, sectionName),
    lang: n === 3 ? 'ko' : 'en',
    meaning: n === 3 ? meaningLine(n, sectionName) : '',
    breaths: n === 1 ? [1] : [],
    time: start + 0.4 + j * 1.6,
  }))
}

export function seededSection(i: number): Section {
  const name = SECTION_NAMES[i]
  const start = 2 + i * 8
  return {
    id: `sec-${i + 1}`,
    name,
    lines: lines(name, start),
    track: { start, end: start + 7 },
    refs: Object.fromEntries(DEFAULT_REFS.map((r) => [r.id, { start: 4 + i * 10, end: 12 + i * 10 }])),
    createdAt: new Date(2030, 0, 1 + i).toISOString(),
  }
}

export interface SeedOptions {
  /** Days from today to the show (default 30: the learning phase). */
  showInDays?: number
  /** Make today the weekly light day. */
  lightToday?: boolean
  /** How many seeded sections (default 3). */
  sections?: number
  /** YouTube video standing in for her track (default the original). */
  standIn?: string
}

/** A save past setup: a show, a plan from today, placeholder sections marked everywhere, a tempo. */
export function setUpSave(opts: SeedOptions = {}): SaveData {
  const d = defaultSave()
  const t = today()
  const wd = weekdayOf(t)
  d.setup = { complete: true, persistAsked: true, persisted: true }
  d.profile = { name: 'Performer', songName: '' }
  d.show = { name: 'Showcase', date: addDays(t, opts.showInDays ?? 30) }
  d.plan = { startDate: t, holidayStart: null, holidayEnd: null, schoolMinutes: 45, holidayMinutes: 120, lightWeekday: opts.lightToday ? wd : (wd + 3) % 7 }
  d.track = { mediaId: null, fileName: '', duration: null, standInYoutubeId: opts.standIn ?? 'JSFG-IE8n_c' }
  d.sections = Array.from({ length: opts.sections ?? 3 }, (_, i) => seededSection(i))
  d.tempo = { bpm: 120, offset: 0.5 }
  return d
}

/** Put a save in place before the app loads (on a plain file of the app's origin). */
export async function seedSave(page: Page, data: SaveData): Promise<void> {
  await page.goto('./manifest.webmanifest')
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEYS.save, JSON.stringify(data)] as const)
}

// ---------------------------------------------------------------------------------------------
// Media made on the spot (nothing downloaded, nothing real)

/** A WAV file: `seconds` of quiet 8 kHz audio with a soft tick on every half second. */
export function wav(seconds: number): Buffer {
  const rate = 8000
  const n = Math.round(rate * seconds)
  const buf = Buffer.alloc(44 + n)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + n, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(rate, 24)
  buf.writeUInt32LE(rate, 28)
  buf.writeUInt16LE(1, 32)
  buf.writeUInt16LE(8, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(n, 40)
  for (let i = 0; i < n; i++) buf[44 + i] = i % (rate / 2) < 40 ? 128 + Math.round(20 * Math.sin(i / 3)) : 128
  return buf
}

export const TRACK_FILE = 'practice-track.wav'

/** Load her track in Grown-ups → Her track (from the grown-ups' home). */
export async function loadTrack(page: Page, seconds: number): Promise<void> {
  await expectRoute(page, '/grownups')
  await tap(page.getByRole('button', { name: 'Her track' }))
  await expectRoute(page, '/grownups/track')
  await page.locator('input[type="file"][name="track"]').setInputFiles({ name: TRACK_FILE, mimeType: 'audio/wav', buffer: wav(seconds) })
  await expect(page.locator('.track-file')).toContainText(TRACK_FILE)
  await tap(page.getByRole('button', { name: 'Done' }))
  await expectRoute(page, '/grownups')
}

/** A short video recorded in the page itself (canvas → MediaRecorder), returned as file bytes. */
export async function makeVideo(page: Page, ms = 1500): Promise<{ buffer: Buffer; mimeType: string }> {
  const r = await page.evaluate(async (ms) => {
    const c = document.createElement('canvas')
    c.width = 320
    c.height = 240
    const g = c.getContext('2d')!
    let k = 0
    const timer = setInterval(() => {
      g.fillStyle = `hsl(${(k++ * 15) % 360} 60% 40%)`
      g.fillRect(0, 0, 320, 240)
    }, 40)
    const rec = new MediaRecorder(c.captureStream(25))
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => chunks.push(e.data)
    const done = new Promise((r) => (rec.onstop = r))
    rec.start()
    await new Promise((r) => setTimeout(r, ms))
    rec.stop()
    await done
    clearInterval(timer)
    const blob = new Blob(chunks, { type: rec.mimeType })
    return { bytes: Array.from(new Uint8Array(await blob.arrayBuffer())), type: rec.mimeType.split(';')[0] }
  }, ms)
  return { buffer: Buffer.from(r.bytes), mimeType: r.type }
}
