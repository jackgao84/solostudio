/**
 * Offline after the first visit, with the real service worker, and the shared origin left alone.
 *
 * 1. Before the app ever loads, another app on the same origin owns caches, storage keys and a
 *    database, and an old Solo Studio cache is lying around.
 * 2. The first visit installs the worker (scoped to /solostudio/), which precaches every file. Only
 *    the stale "solostudio:" cache is deleted.
 * 3. The network goes away for real (this spec runs its own preview server and stops it). Today, a
 *    practice step, a link with a query string and index.html all open from the worker's cache.
 * 4. Everything the app stored is prefixed "solostudio:".
 */
import { spawn, type ChildProcess } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { KEYS } from '../src/storage/keys'
import { expect, expectRoute, setUpSave, test } from './helpers'

const PORTS: Record<string, number> = { 'ipad-portrait': 4291, 'ipad-landscape': 4292 }
const portFor = (project: string): number => PORTS[project] ?? 4293
test.use({ serviceWorkers: 'allow', baseURL: async ({}, use, testInfo) => use(`http://localhost:${portFor(testInfo.project.name)}/solostudio/`) })

async function reachable(url: string): Promise<boolean> {
  try {
    return (await fetch(url)).ok
  } catch {
    return false
  }
}

async function startServer(port: number): Promise<ChildProcess> {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const child = spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' })
  const url = `http://localhost:${port}/solostudio/`
  for (let i = 0; i < 150 && !(await reachable(url)); i++) await new Promise((r) => setTimeout(r, 200))
  expect(await reachable(url), `preview server on ${port}`).toBe(true)
  return child
}

async function stopServer(child: ChildProcess, port: number): Promise<void> {
  if (child.exitCode === null) {
    const exited = new Promise((r) => child.once('exit', r))
    child.kill('SIGTERM')
    await exited
  }
  const url = `http://localhost:${port}/solostudio/`
  for (let i = 0; i < 50 && (await reachable(url)); i++) await new Promise((r) => setTimeout(r, 100))
  expect(await reachable(url), 'the server is really gone').toBe(false)
}

/** Loads that failed because the test cut the network (the browser's own sw.js check). */
const CUT = /Failed to load resource|network connection was lost|could not connect|Load failed|NetworkError|sw\.js/i

test('works offline after the first visit, and leaves the other apps alone', async ({ page, problems }, testInfo) => {
  const port = portFor(testInfo.project.name)
  const server = await startServer(port)
  try {
    // 1. The other app, before Solo Studio ever runs.
    await page.goto('./manifest.webmanifest')
    await page.evaluate(
      async ({ key, json }) => {
        for (const name of ['v1', 'otherapp:precache:1', 'solostudio:precache:stale']) await (await caches.open(name)).put(new Request(`/${name.replace(/:/g, '-')}/probe.txt`), new Response(name))
        localStorage.setItem('otherapp:save', '{"theirs":true}')
        await new Promise((resolve) => {
          const req = indexedDB.open('otherapp-db', 1)
          req.onupgradeneeded = () => req.result.createObjectStore('x')
          req.onsuccess = () => (req.result.close(), resolve(null))
        })
        localStorage.setItem(key, json)
      },
      { key: KEYS.save, json: JSON.stringify(setUpSave({ standIn: '' })) },
    )

    // 2. The first visit: the worker installs and takes control.
    await page.goto('./#/today')
    await expect(page.locator('.block').first()).toBeVisible()
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, undefined, { timeout: 30_000 })
    const sw = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready
      const names = await caches.keys()
      const ours = names.filter((n) => n.startsWith('solostudio:precache:'))
      const files = ours.length === 1 ? (await (await caches.open(ours[0])).keys()).map((r) => new URL(r.url).pathname) : []
      return { scope: new URL(reg.scope).pathname, names, ours, files }
    })
    expect(sw.scope).toBe('/solostudio/')
    expect(sw.ours, 'one current cache; the stale one is gone').toHaveLength(1)
    expect(sw.ours[0]).not.toBe('solostudio:precache:stale')
    expect(sw.names).toContain('v1')
    expect(sw.names).toContain('otherapp:precache:1')
    expect(sw.files).toContain('/solostudio/index.html')
    expect(sw.files).toContain('/solostudio/manifest.webmanifest')
    expect(sw.files.some((f) => f.endsWith('.js'))).toBe(true)
    expect(sw.files.some((f) => f.endsWith('.css'))).toBe(true)
    expect(sw.files.every((f) => f.startsWith('/solostudio/'))).toBe(true)

    // 3. No network from here on.
    await stopServer(server, port)
    await page.reload()
    await expectRoute(page, '/today')
    await expect(page.locator('.block').first()).toBeVisible()
    await page.goto('./?from=icon#/practice/sec-1/rap-say')
    await expect(page.locator('.lyric-line')).toHaveCount(4)
    await page.goto('./index.html#/lessons')
    await expect(page.locator('.lesson-card')).toHaveCount(7)
    await page.goto('./?x=1#/section/sec-2')
    await expect(page.locator('.ladder')).toHaveCount(3)

    // 4. Everything the app stored is prefixed; the other app's things are untouched.
    const stored = await page.evaluate(async () => ({
      keys: Object.keys(localStorage),
      caches: await caches.keys(),
      dbs: (await indexedDB.databases()).map((d) => d.name ?? ''),
      theirs: localStorage.getItem('otherapp:save'),
    }))
    expect(stored.theirs).toBe('{"theirs":true}')
    for (const k of stored.keys.filter((k) => k !== 'otherapp:save')) expect(k.startsWith('solostudio:'), k).toBe(true)
    for (const c of stored.caches.filter((c) => !['v1', 'otherapp:precache:1'].includes(c))) expect(c.startsWith('solostudio:'), c).toBe(true)
    for (const d of stored.dbs.filter((d) => d !== 'otherapp-db')) expect(d.startsWith('solostudio:'), d).toBe(true)
    expect(stored.dbs).toContain('otherapp-db')

    for (let i = problems.length - 1; i >= 0; i--) if (CUT.test(problems[i])) problems.splice(i, 1)
  } finally {
    if (server.exitCode === null) server.kill('SIGTERM')
  }
})
