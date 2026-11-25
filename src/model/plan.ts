/**
 * The plan, built back from the show date.
 *
 * Phases (days to the show): learning while 11 or more (rap lines and the first dance sections from
 * day one; every section learned slowly by about ten days out), putting it together from 10 to 5,
 * show-ready for the last 4 (full run-throughs, performing for family), then show day.
 *
 * Each day is a list of blocks: warm-up, rap, dance, water breaks, together, run-throughs, family,
 * cool-down. The blocks add up to the day's minutes (school day, holiday, or a lighter day: one each
 * week, the day before the show and show day). Rules every day keeps:
 *  - never more than VOICE_LIMIT_MIN minutes of voice (rap, together, run-through, family) in a row;
 *    any other block, a water break included, rests her voice;
 *  - a water break about every 25 minutes: never more than WATER_MAX_GAP_MIN minutes without one;
 *  - from the middle phase on, practice blocks remind her to wear her headset mic or a headband.
 * Everything here is pure, so the same settings always give the same plan.
 */
import { orderSections } from './timing'
import { addDays, daysBetween, weekdayOf } from './dates'
import type { SaveData } from '../storage/schema'

export type Phase = 'learn' | 'together' | 'showReady' | 'showDay'
export type BlockType = 'warmup' | 'rap' | 'dance' | 'water' | 'together' | 'runthrough' | 'family' | 'cooldown'

export const VOICE_TYPES: readonly BlockType[] = ['rap', 'together', 'runthrough', 'family']
export const PINNED_TYPES: readonly BlockType[] = ['warmup', 'water', 'cooldown']
export const VOICE_LIMIT_MIN = 20
export const WATER_EVERY_MIN = 25
export const WATER_MAX_GAP_MIN = 30
export const WATER_MIN = 2
/** Learning runs while the show is this many days away or more. */
export const LEARN_UNTIL_DAYS_OUT = 11
/** The last days before the show are for run-throughs and performing for family. */
export const SHOW_READY_DAYS = 4

export interface PlanInput {
  startDate: string
  showDate: string
  holidayStart: string | null
  holidayEnd: string | null
  schoolMinutes: number
  holidayMinutes: number
  lightWeekday: number
  /** In song order. */
  sectionIds: string[]
}

export interface Block {
  id: string
  type: BlockType
  minutes: number
  sectionIds: string[]
  headset: boolean
}

export interface Focus {
  rap: string[]
  dance: string[]
  together: string[]
}

export interface PlanDay {
  date: string
  daysToShow: number
  phase: Phase
  light: boolean
  holiday: boolean
  minutes: number
  blocks: Block[]
  headset: boolean
  focus: Focus
}

export function phaseFor(daysToShow: number): Phase {
  if (daysToShow <= 0) return 'showDay'
  if (daysToShow <= SHOW_READY_DAYS) return 'showReady'
  if (daysToShow < LEARN_UNTIL_DAYS_OUT) return 'together'
  return 'learn'
}

export const isVoice = (t: BlockType): boolean => VOICE_TYPES.includes(t)

/** Minutes of each run of voice blocks in a row (any other block rests her voice). */
export function voiceRuns(blocks: readonly Pick<Block, 'type' | 'minutes'>[]): number[] {
  const runs: number[] = []
  let run = 0
  for (const b of blocks) {
    if (isVoice(b.type)) run += b.minutes
    else if (run > 0) {
      runs.push(run)
      run = 0
    }
  }
  if (run > 0) runs.push(run)
  return runs
}

/** Minutes between water breaks (from the start, between breaks, and to the end). */
export function waterGaps(blocks: readonly Pick<Block, 'type' | 'minutes'>[]): number[] {
  const gaps: number[] = []
  let gap = 0
  for (const b of blocks) {
    if (b.type === 'water') {
      gaps.push(gap)
      gap = 0
    } else gap += b.minutes
  }
  gaps.push(gap)
  return gaps
}

export function dayOk(blocks: readonly Pick<Block, 'type' | 'minutes'>[]): boolean {
  return voiceRuns(blocks).every((r) => r <= VOICE_LIMIT_MIN) && waterGaps(blocks).every((g) => g <= WATER_MAX_GAP_MIN)
}

// ---------------------------------------------------------------------------------------------
// Minutes

function lightMinutes(normal: number): number {
  const light = Math.max(15, Math.round(normal / 10) * 5)
  return light < normal ? light : Math.max(10, normal - 5)
}

type Weights = Partial<Record<BlockType, number>>

/** What fills the middle of a day, by phase. Dance is the longer job while learning. */
function weightsFor(phase: Phase, light: boolean, daysToShow: number): Weights {
  switch (phase) {
    case 'learn':
      return { rap: 0.38, dance: 0.62 }
    case 'together':
      return light ? { together: 0.45, dance: 0.3, runthrough: 0.25 } : { rap: 0.15, dance: 0.25, together: 0.4, runthrough: 0.2 }
    case 'showReady':
      return light || daysToShow <= 1 ? { runthrough: 0.6, dance: 0.4 } : { runthrough: 0.35, family: 0.2, together: 0.2, dance: 0.25 }
    case 'showDay':
      return { together: 1 }
  }
}

/** Order of types within a day (the brief's order: rap, dance, together, run-through, family). */
const ORDER: readonly BlockType[] = ['rap', 'dance', 'together', 'runthrough', 'family']
const MAX_CHUNK: Record<BlockType, number> = { warmup: 10, rap: 15, dance: 20, water: 2, together: 12, runthrough: 12, family: 10, cooldown: 10 }
const MIN_CHUNK = 3

interface Piece {
  type: BlockType
  minutes: number
}

/** Split `total` minutes between the weighted types (largest remainder), each at least MIN_CHUNK. */
function allocate(total: number, weights: Weights): Piece[] {
  const types = ORDER.filter((t) => (weights[t] ?? 0) > 0)
  const sum = types.reduce((a, t) => a + (weights[t] ?? 0), 0)
  if (total <= 0 || types.length === 0) return []
  // Too little time for every type: keep the heaviest ones that fit.
  let use = types
  while (use.length > 1 && use.length * MIN_CHUNK > total) {
    const lightest = [...use].sort((a, b) => (weights[a] ?? 0) - (weights[b] ?? 0))[0]
    use = use.filter((t) => t !== lightest)
  }
  const wsum = use.reduce((a, t) => a + (weights[t] ?? 0), 0) || sum
  const exact = use.map((t) => (total * (weights[t] ?? 0)) / wsum)
  const out = exact.map((x) => Math.floor(x))
  let left = total - out.reduce((a, b) => a + b, 0)
  const order = exact.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r || a.i - b.i)
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) out[order[k].i]++
  // Each type at least MIN_CHUNK, taken from the largest.
  for (let i = 0; i < out.length; i++) {
    while (out[i] < MIN_CHUNK) {
      const big = out.indexOf(Math.max(...out))
      if (big === i || out[big] <= MIN_CHUNK) break
      out[big]--
      out[i]++
    }
  }
  return use.map((type, i) => ({ type, minutes: out[i] })).filter((p) => p.minutes > 0)
}

/** Split each type's minutes into even blocks no longer than its MAX_CHUNK. */
function chunk(pieces: Piece[]): Piece[][] {
  return pieces.map((p) => {
    const n = Math.max(1, Math.ceil(p.minutes / MAX_CHUNK[p.type]))
    const base = Math.floor(p.minutes / n)
    const extra = p.minutes - base * n
    return Array.from({ length: n }, (_, i) => ({ type: p.type, minutes: base + (i < extra ? 1 : 0) }))
  })
}

/** Round-robin in the brief's order, pulling a non-voice block forward whenever her voice needs a rest. */
function interleave(queues: Piece[][]): Piece[] {
  const qs = queues.map((q) => q.slice())
  const out: Piece[] = []
  let run = 0
  let turn = 0
  const left = () => qs.some((q) => q.length > 0)
  while (left()) {
    let pick = -1
    for (let k = 0; k < qs.length; k++) {
      const i = (turn + k) % qs.length
      if (qs[i].length) {
        pick = i
        break
      }
    }
    const next = qs[pick][0]
    if (isVoice(next.type) && run > 0 && run + next.minutes > VOICE_LIMIT_MIN) {
      const rest = qs.findIndex((q) => q.length > 0 && !isVoice(q[0].type))
      if (rest >= 0) pick = rest
    }
    const piece = qs[pick].shift()!
    out.push(piece)
    run = isVoice(piece.type) ? run + piece.minutes : 0
    turn = (pick + 1) % qs.length
  }
  return out
}

/** Insert water breaks: before the gap since the last one would pass the limit, or to rest her voice. */
function placeWater(seq: Piece[]): Piece[] {
  const out: Piece[] = []
  let since = 0
  let run = 0
  seq.forEach((p, idx) => {
    const first = idx === 0
    const needWater = !first && (since + p.minutes > WATER_MAX_GAP_MIN || (isVoice(p.type) && run > 0 && run + p.minutes > VOICE_LIMIT_MIN))
    if (needWater) {
      out.push({ type: 'water', minutes: WATER_MIN })
      since = 0
      run = 0
    }
    out.push(p)
    since += p.minutes
    run = isVoice(p.type) ? run + p.minutes : 0
  })
  return out
}

/** The blocks of one day, adding up to exactly `minutes`. */
function layout(minutes: number, phase: Phase, light: boolean, daysToShow: number): Piece[] {
  const warm = minutes >= 90 ? 10 : 5
  const cool = minutes >= 90 ? 8 : minutes >= 40 ? 5 : minutes >= 25 ? 4 : 3
  const weights = weightsFor(phase, light, daysToShow)
  const build = (k: number): Piece[] => {
    const middle = Math.max(0, minutes - warm - cool - WATER_MIN * k)
    const seq = interleave(chunk(allocate(middle, weights)))
    return placeWater([{ type: 'warmup', minutes: warm }, ...seq, { type: 'cooldown', minutes: cool }])
  }
  const waters = (day: Piece[]) => day.filter((p) => p.type === 'water').length
  const k0 = Math.max(0, Math.ceil((minutes - WATER_MAX_GAP_MIN) / (WATER_MAX_GAP_MIN + WATER_MIN)))
  let fallback: Piece[] | null = null
  for (let k = k0; k <= k0 + 6; k++) {
    const day = build(k)
    const placed = waters(day)
    if (placed === k && dayOk(day)) return day
    if (placed < k && !fallback) {
      // Fewer breaks were needed than reserved: give the spare minutes back to the day.
      const spare = WATER_MIN * (k - placed)
      const padded = pad(day, spare)
      if (padded && dayOk(padded)) fallback = padded
    }
  }
  return fallback ?? safeLayout(minutes, warm, cool, weights)
}

/** Add `spare` minutes to blocks without breaking the rules (dance first, then the cool-down). */
function pad(day: Piece[], spare: number): Piece[] | null {
  const out = day.map((p) => ({ ...p }))
  const candidates = out
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.type === 'dance' || p.type === 'cooldown' || p.type === 'warmup')
    .reverse()
  for (const { p } of candidates) {
    while (spare > 0) {
      p.minutes++
      if (!dayOk(out) || p.minutes > MAX_CHUNK[p.type] + 3) {
        p.minutes--
        break
      }
      spare--
    }
    if (spare === 0) return out
  }
  return null
}

/** A plain layout that always keeps the rules: short blocks, water whenever it's due. */
function safeLayout(minutes: number, warm: number, cool: number, weights: Weights): Piece[] {
  const types = ORDER.filter((t) => (weights[t] ?? 0) > 0)
  const out: Piece[] = [{ type: 'warmup', minutes: warm }]
  let left = minutes - warm - cool
  let since = warm
  let run = 0
  let i = 0
  while (left > 0) {
    const type = types[i % types.length]
    let size = Math.min(8, left)
    if (left - size > 0 && left - size < MIN_CHUNK) size = left
    if (since + size > WATER_MAX_GAP_MIN - cool || (isVoice(type) && run + size > VOICE_LIMIT_MIN)) {
      if (left <= WATER_MIN) break
      out.push({ type: 'water', minutes: WATER_MIN })
      left -= WATER_MIN
      since = 0
      run = 0
      continue
    }
    out.push({ type, minutes: size })
    left -= size
    since += size
    run = isVoice(type) ? run + size : 0
    i++
  }
  out.push({ type: 'cooldown', minutes: cool + Math.max(0, left) })
  return out
}

// ---------------------------------------------------------------------------------------------
// Which sections each day works on

function learnFocus(k: number, n: number, ids: string[], learnDays: number, factor: number, day: number): string[] {
  if (n === 0) return []
  void k
  const intro = (j: number) => Math.floor((j * learnDays * factor) / n)
  const today = ids.map((_, j) => j).filter((j) => intro(j) === day)
  const introduced = ids.map((_, j) => j).filter((j) => intro(j) <= day)
  const set = today.length ? today : [Math.max(...introduced)]
  const first = Math.min(...set)
  const withPrev = first > 0 ? [first - 1, ...set] : set
  return withPrev.map((j) => ids[j])
}

function cycleFocus(ids: string[], j: number): string[] {
  const n = ids.length
  if (n === 0) return []
  const k = ((j % n) + n) % n
  return k > 0 ? [ids[k - 1], ids[k]] : [ids[k]]
}

// ---------------------------------------------------------------------------------------------
// The plan

export function buildPlan(input: PlanInput): PlanDay[] {
  const total = daysBetween(input.startDate, input.showDate)
  if (total < 0) return []
  const startOut = total
  const learnDays = Math.max(0, startOut - LEARN_UNTIL_DAYS_OUT + 1)
  const firstTogether = Math.max(0, startOut - (LEARN_UNTIL_DAYS_OUT - 1))
  const ids = input.sectionIds
  const days: PlanDay[] = []
  for (let i = 0; i <= total; i++) {
    const date = addDays(input.startDate, i)
    const daysToShow = total - i
    const phase = phaseFor(daysToShow)
    const holiday = !!input.holidayStart && date >= input.holidayStart && date <= (input.holidayEnd ?? input.showDate)
    const normal = holiday ? input.holidayMinutes : input.schoolMinutes
    const light = weekdayOf(date) === input.lightWeekday || daysToShow <= 1
    const minutes = phase === 'showDay' ? Math.min(20, lightMinutes(normal)) : light ? lightMinutes(normal) : normal
    const headset = phase !== 'learn'

    let focus: Focus
    if (phase === 'learn') {
      focus = {
        rap: learnFocus(0, ids.length, ids, learnDays, 0.4, i),
        dance: learnFocus(0, ids.length, ids, learnDays, 0.7, i),
        together: [],
      }
    } else if (phase === 'together') {
      const f = cycleFocus(ids, i - firstTogether)
      focus = { rap: f, dance: f, together: f }
    } else {
      focus = { rap: [], dance: [], together: cycleFocus(ids, i - firstTogether) }
    }

    const pieces = layout(minutes, phase, light, daysToShow)
    const blocks: Block[] = pieces.map((p, idx) => ({
      id: `${date}-${idx}-${p.type}`,
      type: p.type,
      minutes: p.minutes,
      sectionIds: p.type === 'rap' ? focus.rap : p.type === 'dance' ? focus.dance : p.type === 'together' ? focus.together : [],
      headset: headset && (isVoice(p.type) || p.type === 'dance'),
    }))
    days.push({ date, daysToShow, phase, light, holiday, minutes, blocks, headset, focus })
  }
  return days
}

export function planDay(input: PlanInput, date: string): PlanDay | null {
  if (date < input.startDate || date > input.showDate) return null
  return buildPlan(input).find((d) => d.date === date) ?? null
}

export function planInputFrom(save: SaveData): PlanInput | null {
  if (!save.show || !save.plan) return null
  return {
    startDate: save.plan.startDate,
    showDate: save.show.date,
    holidayStart: save.plan.holidayStart,
    holidayEnd: save.plan.holidayEnd,
    schoolMinutes: save.plan.schoolMinutes,
    holidayMinutes: save.plan.holidayMinutes,
    lightWeekday: save.plan.lightWeekday,
    sectionIds: orderSections(save.sections).map((s) => s.id),
  }
}

// ---------------------------------------------------------------------------------------------
// Her own order

export type MoveResult = { ok: true; blocks: Block[] } | { ok: false; reason: 'pinned' | 'edge' | 'voice' | 'water' }

/** Move a block past its neighbour (water breaks stay where they are). */
export function moveBlock(blocks: readonly Block[], id: string, dir: -1 | 1): MoveResult {
  const i = blocks.findIndex((b) => b.id === id)
  if (i < 0) return { ok: false, reason: 'edge' }
  if (PINNED_TYPES.includes(blocks[i].type)) return { ok: false, reason: 'pinned' }
  let j = i + dir
  while (j >= 0 && j < blocks.length && blocks[j].type === 'water') j += dir
  if (j < 0 || j >= blocks.length || PINNED_TYPES.includes(blocks[j].type)) return { ok: false, reason: 'edge' }
  const out = blocks.slice()
  ;[out[i], out[j]] = [out[j], out[i]]
  if (!voiceRuns(out).every((r) => r <= VOICE_LIMIT_MIN)) return { ok: false, reason: 'voice' }
  if (!waterGaps(out).every((g) => g <= WATER_MAX_GAP_MIN)) return { ok: false, reason: 'water' }
  return { ok: true, blocks: out }
}

/** Her saved order for a day, if it still matches the day's blocks. */
export function applyOrder(blocks: readonly Block[], order: readonly string[]): Block[] {
  if (order.length !== blocks.length) return blocks.slice()
  const byId = new Map(blocks.map((b) => [b.id, b]))
  if (new Set(order).size !== order.length || !order.every((id) => byId.has(id))) return blocks.slice()
  return order.map((id) => byId.get(id)!)
}
