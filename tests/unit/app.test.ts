/**
 * App plumbing: the version line in the grown-ups' area, the routes where an update must never
 * reload the page (practice of any kind), and the grown-ups' press-and-hold.
 */
import { describe, expect, it } from 'vitest'
import { GATE_HOLD_MS } from '../../src/app/gate'
import { busyRoute } from '../../src/app/sw-register'
import { versionLine } from '../../src/app/version'

describe('version line', () => {
  it('reads "Version x · build y · date"', () => {
    expect(versionLine({ version: '1.0.0', build: 'c65c177', built: '2031-03-03' })).toBe('Version 1.0.0 · build c65c177 · 2031-03-03')
    expect(versionLine({ version: '1.0.0', build: 'dev', built: '' })).toBe('Version 1.0.0 · build dev')
  })
})

describe('updates never reload mid-practice', () => {
  it('treats every practice route as busy', () => {
    for (const hash of ['#/practice/v1/rap-listen', '#/block/2031-03-03-1-rap', '#/showtime', '#/record/v1', '#/record/run', '#/quiz/v1/words', '#/quiz/v1/counts', '#/practice/v1/rap-fade?x=1'])
      expect(busyRoute(hash), hash).toBe(true)
    for (const hash of ['', '#/', '#/today', '#/sections', '#/section/v1', '#/lessons', '#/grownups', '#/clips', '#/welcome'])
      expect(busyRoute(hash), hash).toBe(false)
  })
})

describe('grown-ups gate', () => {
  it('is a press-and-hold of about two seconds', () => {
    expect(GATE_HOLD_MS).toBeGreaterThanOrEqual(1500)
    expect(GATE_HOLD_MS).toBeLessThanOrEqual(3000)
  })
})
