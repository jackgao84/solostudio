/**
 * Version 1.1's screens where she is practising are "busy": an update never reloads the page there.
 * (tests/unit/app.test.ts covers 1.0's routes; this covers the routes 1.1 adds.)
 */
import { describe, expect, it } from 'vitest'
import { busyRoute } from '../../src/app/sw-register'

describe('1.1 practice routes are busy', () => {
  it('never reloads during a drill', () => {
    for (const hash of ['#/drill/anywhere', '#/drill/rejoin', '#/drill/anywhere?block=2031-03-03-4-anywhere']) expect(busyRoute(hash), hash).toBe(true)
  })

  it('still lets Today, her stage and the grown-ups’ area update', () => {
    for (const hash of ['#/today', '#/sections', '#/grownups', '#/grownups/week', '#/lessons']) expect(busyRoute(hash), hash).toBe(false)
  })
})
