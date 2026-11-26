/**
 * A save exactly as version 1.2 of the app wrote it (schema version 3), after a grown-up has done
 * most of the setup wizard and she has practised for a while: the 1.1 parts plus narration (turned
 * off), her skill lessons (two finished, one with a video a grown-up swapped in) and the wizard
 * (paused on the beat step). Placeholders only. Used by the 1.3 migration checks (unit and WebKit).
 */
import { v2Save } from './v2-save'

export function v3Save(opts: { showDate?: string; startDate?: string; trackMediaId?: string | null } = {}): Record<string, unknown> {
  return {
    ...v2Save({ showDate: opts.showDate, startDate: opts.startDate, trackMediaId: opts.trackMediaId }),
    schemaVersion: 3,
    narration: { on: false },
    lessons: { done: ['counting', 'learning-a-dance'], videos: { counting: { youtubeId: 'N6t8hwKp71g', start: 12 } } },
    wizard: { at: 'beat', done: ['track', 'lines', 'starts', 'follow', 'timing'] },
  }
}
