/**
 * The guided session in progress (in memory: a reload ends it, and every screen then works as usual).
 * Each item opens its own screen with ?session=1; that screen says the item's cue between reps, and
 * calls sessionNext() when she taps I did it or Next. A block is marked done as she leaves its last
 * item. At the end: a spoken "that's today's practice done", and back to Today.
 */
import { say } from '../audio/voice'
import { KID_COPY } from '../content/kid'
import { planDay, planInputFrom } from '../model/plan'
import { cueFor, routeFor, sessionItems, type SessionItem } from '../model/session'
import { getActiveBlock, go, save, setActiveBlock, today, update } from './ctx'

interface Running {
  date: string
  items: SessionItem[]
  index: number
}

let running: Running | null = null

/** Today's session items (nothing when there's no plan for today or it's all done). */
export function todaysItems(): SessionItem[] {
  const input = planInputFrom(save())
  const day = input ? planDay(input, today()) : null
  return day ? sessionItems(save(), day, today()) : []
}

export function startSession(): boolean {
  const items = todaysItems()
  if (!items.length) return false
  running = { date: today(), items, index: 0 }
  enter()
  return true
}

function enter(): void {
  const it = running!.items[running!.index]
  const active = getActiveBlock()
  if (!active || active.id !== it.blockId || active.date !== running!.date) setActiveBlock({ id: it.blockId, date: running!.date, startedAt: Date.now() })
  go(routeFor(it))
}

/** The item this screen is showing in the session, or null when it isn't part of one. */
export function sessionItem(query: URLSearchParams): SessionItem | null {
  if (query.get('session') !== '1' || !running || running.date !== today()) return null
  return running.items[running.index] ?? null
}

/** What to say before the current item. */
export function sessionCue(): string {
  const it = running?.items[running.index]
  return it ? cueFor(it, save()) : ''
}

export function sessionProgress(): { n: number; total: number } {
  if (!running) return { n: 0, total: 0 }
  const blocks = [...new Set(running.items.map((i) => i.blockId))]
  return { n: blocks.indexOf(running.items[running.index].blockId) + 1, total: blocks.length }
}

/** On to the next item (I did it or Next). */
export function sessionNext(): void {
  if (!running) return go('/today')
  const cur = running.items[running.index]
  const nxt = running.items[running.index + 1]
  if (!nxt || nxt.blockId !== cur.blockId) {
    update((d) => {
      const s = (d.days[running!.date] ??= { order: [], done: [] })
      if (!s.done.includes(cur.blockId)) s.done.push(cur.blockId)
    })
  }
  running.index++
  if (running.index >= running.items.length) {
    running = null
    setActiveBlock(null)
    go('/today')
    say(KID_COPY.cues.sessionDone)
    return
  }
  enter()
}

export function endSession(): void {
  running = null
}
