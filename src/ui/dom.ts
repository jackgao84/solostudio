/** Tiny DOM helpers: h() builds elements, fill() fills {slots} in copy. */
type Handler = (e: Event) => void
export type Attrs = Record<string, string | number | boolean | null | undefined | Handler>
export type Child = Node | string | number | null | undefined | false | Child[]

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Attrs | null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue
      if (typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as Handler)
      else if (k === 'class') el.className = String(v)
      else if (k === 'value' && 'value' in el) (el as unknown as { value: string }).value = String(v)
      else el.setAttribute(k, v === true ? '' : String(v))
    }
  }
  append(el, children)
  return el
}

export function append(el: Element, children: Child[]): void {
  for (const c of children) {
    if (c == null || c === false) continue
    if (Array.isArray(c)) append(el, c)
    else el.append(typeof c === 'number' ? String(c) : c)
  }
}

/** "{days} days to {show}" + { days: 3, show: … }. */
export function fill(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}

export function clear(el: Element): void {
  el.replaceChildren()
}

/** Run `fn` safely; a failure is reported as a warning, never thrown into the page. */
export function safely(what: string, fn: () => void): void {
  try {
    fn()
  } catch (err) {
    console.warn(`[solostudio] ${what} failed`, err)
  }
}
