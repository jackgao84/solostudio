/**
 * Service worker registration and safe updates (the Up Anyway pattern).
 *
 * Checking: the Home Screen app is often resumed without loading a page, so checkForUpdate() asks for
 * a fresh sw.js on launch, whenever the app comes back to the foreground and when the iPad comes back
 * online; one check at a time, quietly ignored offline.
 *
 * Applying: a new version installs in the background and waits. It is switched on only when she taps
 * "New version" (on Today) or a grown-up taps Restart now, never during practice: a page that didn't
 * ask for the switch never reloads, even when another tab made it. The save lives in localStorage
 * and media in IndexedDB, and neither is touched; the new worker deletes only older "solostudio:"
 * caches.
 */
import { SW_SKIP_WAITING } from '../storage/keys'

const APPLY_TIMEOUT_MS = 5000
/** Routes where nothing may reload the page: any practice. */
const BUSY = /^#\/(practice|block|showtime|record|quiz)(\/|\?|$)/

let registration: ServiceWorkerRegistration | null = null
let checking = false
let applying = false
let reloaded = false
const listeners = new Set<() => void>()

function enabled(): boolean {
  return import.meta.env.PROD && typeof navigator !== 'undefined' && 'serviceWorker' in navigator
}

export function busyRoute(hash: string = window.location.hash): boolean {
  return BUSY.test(hash)
}

function waitingWorker(): ServiceWorker | null {
  const reg = registration
  if (!reg || !reg.active) return null
  const waiting = reg.waiting
  return waiting && waiting.state === 'installed' ? waiting : null
}

function notify(): void {
  if (!waitingWorker()) return
  for (const cb of [...listeners]) cb()
}

function watchInstalling(worker: ServiceWorker | null): void {
  if (!worker) return
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed') notify()
  })
}

function track(reg: ServiceWorkerRegistration | undefined): void {
  if (!reg || registration) return
  registration = reg
  watchInstalling(reg.installing)
  reg.addEventListener('updatefound', () => watchInstalling(reg.installing))
  notify()
  checkForUpdate()
}

export function checkForUpdate(): void {
  const reg = registration
  if (!reg || !enabled() || checking) return
  if (typeof navigator.onLine === 'boolean' && !navigator.onLine) return
  checking = true
  reg
    .update()
    .catch(() => undefined)
    .then(() => {
      checking = false
    })
}

export function registerServiceWorker(): void {
  if (!enabled()) return
  const base = import.meta.env.BASE_URL
  const sw = navigator.serviceWorker
  sw.addEventListener('controllerchange', () => {
    if (!applying || reloaded) return
    reloaded = true
    window.location.reload()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate()
  })
  window.addEventListener('pageshow', () => checkForUpdate())
  window.addEventListener('online', () => checkForUpdate())
  sw.register(base + 'sw.js', { scope: base, updateViaCache: 'none' }).then(track, (err: unknown) => {
    console.warn('[solostudio] service worker registration failed', err)
    sw.getRegistration(base).then(track, () => undefined)
  })
}

export function updateReady(): boolean {
  return enabled() && waitingWorker() !== null
}

/** Switch on a waiting update (the page reloads once). Never on a practice route. */
export function applyUpdateIfSafe(): boolean {
  if (!enabled()) return false
  if (applying) return true
  if (busyRoute()) return false
  const waiting = waitingWorker()
  if (!waiting) return false
  applying = true
  window.setTimeout(() => {
    if (!reloaded) applying = false
  }, APPLY_TIMEOUT_MS)
  waiting.postMessage(SW_SKIP_WAITING)
  return true
}

export function onUpdateReady(cb: () => void): () => void {
  listeners.add(cb)
  if (enabled() && waitingWorker()) cb()
  return () => {
    listeners.delete(cb)
  }
}
