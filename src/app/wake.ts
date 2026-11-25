/**
 * Keeps the screen awake while she practises (Screen Wake Lock, Safari 16.4+). Asked for on every
 * practice screen, let go everywhere else, and asked for again when the app comes back to the front.
 */
interface Sentinel {
  release(): Promise<void>
  addEventListener(type: 'release', cb: () => void): void
}
interface WakeLockApi {
  request(type: 'screen'): Promise<Sentinel>
}

let wanted = false
let sentinel: Sentinel | null = null
let pending = false

function api(): WakeLockApi | null {
  return 'wakeLock' in navigator ? ((navigator as unknown as { wakeLock: WakeLockApi }).wakeLock ?? null) : null
}

async function acquire(): Promise<void> {
  const wl = api()
  if (!wl || sentinel || pending || document.visibilityState !== 'visible') return
  pending = true
  try {
    const s = await wl.request('screen')
    sentinel = s
    s.addEventListener('release', () => {
      if (sentinel === s) sentinel = null
    })
  } catch (err) {
    console.warn('[solostudio] wake lock unavailable', err)
  } finally {
    pending = false
    if (!wanted) release()
  }
}

function release(): void {
  const s = sentinel
  sentinel = null
  if (s) s.release().catch(() => undefined)
}

export function keepAwake(on: boolean): void {
  wanted = on
  if (on) void acquire()
  else release()
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wanted) void acquire()
})
