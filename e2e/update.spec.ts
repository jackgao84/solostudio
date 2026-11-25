/**
 * A new deploy reaches the installed app without reinstalling it, and never reloads mid-practice.
 *
 * This spec serves the built app itself (dist/, with GitHub Pages' max-age=600) and "deploys" a new
 * version by serving a sw.js whose version (and so its cache name) has changed, exactly as a new
 * build does. Today is open on the old version; coming back to the foreground finds the new one; it
 * installs in the background and Today shows a small "New version" button; nothing reloads by itself.
 * A second tab in the middle of practice never reloads, even when the first switches over. The tap
 * reloads once into the new version: only the old "solostudio:" cache is gone, the other app's caches
 * and keys are untouched, and her save is exactly what it was. The grown-ups' area shows the version.
 */
import { createServer, type Server } from 'node:http'
import { readFileSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'
import { expect, expectRoute, holdGate, readSave, seedSave, setUpSave, tap, test } from './helpers'

const PORTS: Record<string, number> = { 'ipad-portrait': 4295, 'ipad-landscape': 4296 }
const portFor = (project: string): number => PORTS[project] ?? 4297
test.describe.configure({ mode: 'serial' })
test.use({ serviceWorkers: 'allow', baseURL: async ({}, use, testInfo) => use(`http://localhost:${portFor(testInfo.project.name)}/solostudio/`) })

const DIST = fileURLToPath(new URL('../dist/', import.meta.url))
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

async function startServer(port: number): Promise<{ deployNext(): void; close(): Promise<void> }> {
  let next = false
  const server: Server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)
    if (!path.startsWith('/solostudio/')) return void res.writeHead(404).end()
    let rel = path.slice('/solostudio/'.length)
    if (!rel || rel.endsWith('/')) rel += 'index.html'
    rel = normalize(rel).replace(/^(\.\.[/\\])+/, '')
    const file = join(DIST, rel)
    try {
      if (!statSync(file).isFile()) throw new Error('not a file')
    } catch {
      return void res.writeHead(404).end()
    }
    let body: Buffer | string = readFileSync(file)
    if (rel === 'sw.js' && next) body = body.toString('utf8').replace(/const VERSION = "([0-9a-f]+)"/, 'const VERSION = "$1next"')
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'max-age=600' })
    res.end(body)
  })
  await new Promise<void>((resolve) => server.listen(port, 'localhost', resolve))
  return {
    deployNext: () => {
      next = true
    },
    close: () => new Promise((resolve) => server.close(() => resolve())),
  }
}

const ours = (page: Page) => page.evaluate(async () => (await caches.keys()).filter((n) => n.startsWith('solostudio:')).sort())
const mark = (page: Page) => page.evaluate(() => void ((window as unknown as { __mark: number }).__mark = 1))
const marked = (page: Page) => page.evaluate(() => (window as unknown as { __mark?: number }).__mark === 1)

test('"New version" appears on Today, never reloads mid-practice, and keeps everything', async ({ page, context }, testInfo) => {
  const server = await startServer(portFor(testInfo.project.name))
  try {
    await seedSave(page, setUpSave())
    await page.goto('./#/today')
    await expect(page.locator('.block').first()).toBeVisible()
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, undefined, { timeout: 30_000 })
    await page.evaluate(async () => {
      for (const name of ['v1', 'otherapp:precache:1']) await (await caches.open(name)).put(new Request(`/${name.replace(/:/g, '-')}/probe.txt`), new Response(name))
      localStorage.setItem('otherapp:save', '{"theirs":true}')
    })
    const [oldCache] = await ours(page)
    expect(oldCache).toMatch(/^solostudio:precache:[0-9a-f]+$/)
    const update = page.locator('.update-banner')
    await expect(update).toBeHidden()
    await mark(page)

    // A second tab in the middle of practice.
    const practising = await context.newPage()
    await practising.goto('./#/practice/sec-1/rap-say')
    await expect(practising.locator('.lyric-line')).toHaveCount(4)
    await mark(practising)
    const before = await readSave(page)

    await practising.waitForFunction(() => navigator.serviceWorker.ready.then(() => true))
    await page.waitForTimeout(2500)
    server.deployNext()
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await expect(update, 'the update was found and installed').toBeVisible({ timeout: 30_000 })
    await expect(update.getByRole('button')).toContainText('New version')
    expect(await marked(page), 'nothing reloaded by itself').toBe(true)
    expect(await ours(page)).toHaveLength(2)

    await expect(practising.locator('.update-banner')).toHaveCount(0)
    await tap(update.getByRole('button'))
    await page.waitForFunction(() => !(window as unknown as { __mark?: number }).__mark, undefined, { timeout: 30_000 })
    await expectRoute(page, '/today')
    await expect(page.locator('.block').first()).toBeVisible()
    await expect(page.locator('.update-banner')).toBeHidden()
    await practising.waitForTimeout(1500)
    expect(await marked(practising), 'practice was not reloaded').toBe(true)
    await expectRoute(practising, '/practice/sec-1/rap-say')

    expect(await ours(page)).toEqual([`${oldCache}next`])
    const all = await page.evaluate(async () => (await caches.keys()).sort())
    expect(all).toContain('v1')
    expect(all).toContain('otherapp:precache:1')
    expect(await page.evaluate(() => localStorage.getItem('otherapp:save'))).toBe('{"theirs":true}')
    expect(await readSave(page)).toEqual(before)

    await holdGate(page)
    await expect(page.locator('.version-line')).toHaveText(/^Version \d+\.\d+\.\d+ · build [0-9a-z]{4,} · \d{4}-\d{2}-\d{2}$/)
    await practising.close()
  } finally {
    await server.close()
  }
})
