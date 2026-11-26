/**
 * Hash router. Each screen draws into the root and may return a cleanup. Guards: practice needs no
 * setup (version 1.3), so all of her screens are open from the start; a fresh iPad opens on the
 * welcome until a grown-up has set things up or she has saved a part of her own. The grown-ups' area
 * needs the press-and-hold; leaving it locks it again. Practice screens keep the screen awake.
 */
import { busyRoute } from './sw-register'
import { grownupsUnlocked, lockGrownups, save } from './ctx'
import { keepAwake } from './wake'

export interface RouteCtx {
  params: Record<string, string>
  query: URLSearchParams
  path: string
}
export type Screen = (root: HTMLElement, ctx: RouteCtx) => void | (() => void)

interface Route {
  re: RegExp
  keys: string[]
  screen: Screen
}

export class Router {
  private routes: Route[] = []
  private cleanup: (() => void) | null = null

  constructor(
    private readonly root: HTMLElement,
    table: [string, Screen][],
  ) {
    for (const [pattern, screen] of table) {
      const keys: string[] = []
      const re = new RegExp(
        '^' +
          pattern.replace(/:(\w+)/g, (_, k: string) => {
            keys.push(k)
            return '([^/]+)'
          }) +
          '$',
      )
      this.routes.push({ re, keys, screen })
    }
  }

  start(): void {
    window.addEventListener('hashchange', () => this.render())
    this.render()
  }

  private redirect(path: string): string | null {
    const d = save()
    const grown = path === '/grownups' || path.startsWith('/grownups/')
    if (grown) return grownupsUnlocked() ? null : d.setup.complete ? '/today' : '/welcome'
    const front = path === '/' || path === ''
    if (!d.setup.complete && !d.parts.length) return front ? '/welcome' : null
    if (front || (path === '/welcome' && d.setup.complete)) return '/today'
    return null
  }

  render(): void {
    const raw = window.location.hash.replace(/^#/, '') || '/'
    const [path, q = ''] = raw.split('?')
    const to = this.redirect(path)
    if (to) {
      window.location.replace(`#${to}`)
      return
    }
    if (!(path === '/grownups' || path.startsWith('/grownups/'))) lockGrownups()
    if (this.cleanup) {
      const c = this.cleanup
      this.cleanup = null
      try {
        c()
      } catch (err) {
        console.warn('[solostudio] cleanup failed', err)
      }
    }
    this.root.replaceChildren()
    window.scrollTo(0, 0)
    keepAwake(busyRoute(window.location.hash))
    for (const r of this.routes) {
      const m = r.re.exec(path)
      if (!m) continue
      const params: Record<string, string> = {}
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])))
      const out = r.screen(this.root, { params, query: new URLSearchParams(q), path })
      this.cleanup = typeof out === 'function' ? out : null
      return
    }
    window.location.replace('#/today')
  }
}
