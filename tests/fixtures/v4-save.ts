/**
 * A save exactly as version 1.3 of the app wrote it (schema version 4): the 1.2 save plus her own
 * parts (one on the mirrored follow-along with two speeds ticked, one on her track) and a teacher's
 * demo filmed on the iPad. Placeholders only. Used by the 1.4 migration checks (unit and WebKit).
 */
import { DEFAULT_REFS } from '../../src/content/references'
import { v3Save } from './v3-save'

/** The seven videos 1.3 started every iPad with (1.4 adds two more under their own names). */
export const V4_DEFAULT_REF_IDS = ['ref-listen', 'ref-original', 'ref-performance', 'ref-mirrored', 'ref-tutorialFull', 'ref-tutorialParts', 'ref-slow']

export function v4Save(opts: { showDate?: string; startDate?: string; trackMediaId?: string | null } = {}): Record<string, unknown> {
  const refs = DEFAULT_REFS.filter((r) => V4_DEFAULT_REF_IDS.includes(r.id)).map((r) => ({ ...r }))
  refs.push({ id: 'ref-local-demo0001', role: 'local', label: 'Teacher demo', kind: 'local', youtubeId: '', mediaId: 'media-video-demo0001', fileName: 'demo.mov', synced: true, alreadyMirrored: false, mirror: true })
  return {
    ...v3Save({ showDate: opts.showDate, startDate: opts.startDate, trackMediaId: opts.trackMediaId }),
    schemaVersion: 4,
    refs,
    parts: [
      { id: 'part-spin', name: 'Spin', source: 'ref-mirrored', from: 12.4, to: 15.2, done: [0.5, 0.75], createdAt: '2031-03-07T10:00:00.000Z' },
      { id: 'part-hook', name: 'The hook', source: 'track', from: 30, to: 36.5, done: [], createdAt: '2031-03-07T10:05:00.000Z' },
    ],
  }
}
