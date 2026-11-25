/** Local calendar days as YYYY-MM-DD. */
import { describe, expect, it } from 'vitest'
import { addDays, dayKey, daysBetween, isDayKey, weekdayOf } from '../../src/model/dates'

describe('calendar days', () => {
  it('formats a local date', () => {
    expect(dayKey(new Date(2031, 0, 5, 23, 59))).toBe('2031-01-05')
  })

  it('adds days across months, years and clock changes', () => {
    expect(addDays('2031-01-31', 1)).toBe('2031-02-01')
    expect(addDays('2031-12-31', 1)).toBe('2032-01-01')
    expect(addDays('2032-02-28', 1)).toBe('2032-02-29')
    expect(addDays('2031-03-29', 2)).toBe('2031-03-31')
    expect(addDays('2031-10-25', 3)).toBe('2031-10-28')
    expect(addDays('2031-03-05', -5)).toBe('2031-02-28')
  })

  it('counts days between', () => {
    expect(daysBetween('2031-03-03', '2031-04-12')).toBe(40)
    expect(daysBetween('2031-04-12', '2031-03-03')).toBe(-40)
    expect(daysBetween('2031-03-28', '2031-04-02')).toBe(5)
  })

  it('knows the weekday', () => {
    expect(weekdayOf('2031-03-03')).toBe(1)
    expect(weekdayOf('2031-03-09')).toBe(0)
  })

  it('checks the shape', () => {
    expect(isDayKey('2031-03-03')).toBe(true)
    expect(isDayKey('2031-3-3')).toBe(false)
    expect(isDayKey('2031-02-30')).toBe(false)
  })
})
