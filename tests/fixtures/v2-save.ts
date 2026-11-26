/**
 * A save exactly as version 1.1 of the app wrote it (schema version 2), after a grown-up has done the
 * whole setup and she has practised for a while: the 1.0 parts plus her stage, sounds, the Showtime
 * routine, notes, the practice log, the tour and celebrations, all changed from their defaults.
 * Placeholders only. Used by the 1.2 migration checks (unit and WebKit).
 */
import { v1Save } from './v1-save'

export function v2Save(opts: { showDate?: string; startDate?: string; trackMediaId?: string | null; untimed?: boolean } = {}): Record<string, unknown> {
  const base = v1Save({ showDate: opts.showDate, startDate: opts.startDate, trackMediaId: opts.trackMediaId, withShowtime: true })
  const sections = base.sections as { lines: { time: number | null }[] }[]
  if (opts.untimed) for (const s of sections) for (const l of s.lines) l.time = null
  return {
    ...base,
    schemaVersion: 2,
    stage: { name: 'Practice Palace', theme: 'ocean', stick: 'cyan' },
    sound: { voiceOn: true, voiceVolume: 0.8, effectsOn: false, effectsVolume: 0.4, audience: false },
    showtime: { breaths: 2, walkOnSeconds: 8 },
    notes: { teacher: { v1: 'Chin up on the last line' }, forHer: { text: 'Have fun today', at: '2031-03-05T08:00:00.000Z', seen: true } },
    activity: { '2031-03-04': { seconds: 1800, ticks: [{ section: 'v1', step: 'rap-say' }], shaky: ['v1'] } },
    tour: { seen: true },
    celebrated: { firstShowtime: true },
  }
}
