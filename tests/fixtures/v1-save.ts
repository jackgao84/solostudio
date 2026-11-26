/**
 * A save exactly as version 1.0.0 of the app wrote it (schema version 1), after a grown-up has done
 * the whole setup and she has practised a little. Placeholders only: no real lines, names or dates
 * from the brief. Used by the migration checks (unit and WebKit).
 */
import { lyricLine, meaningLine } from './placeholders'

/** A version-1 save, as a plain JSON-ready object (a fresh copy each call). */
export function v1Save(opts: { showDate?: string; startDate?: string; withShowtime?: boolean; trackMediaId?: string | null } = {}): Record<string, unknown> {
  const showDate = opts.showDate ?? '2031-04-12'
  const startDate = opts.startDate ?? '2031-03-03'
  const lines = (name: string, start: number) =>
    [1, 2, 3, 4].map((n, j) => ({
      id: `${name.replace(/\W/g, '').toLowerCase()}-l${n}`,
      lyric: lyricLine(n, name),
      lang: n === 3 ? 'ko' : 'en',
      meaning: n === 3 ? meaningLine(n, name) : '',
      breaths: n === 1 ? [1] : [],
      time: start + 0.4 + j * 1.6,
    }))
  const section = (id: string, name: string, start: number, created: string) => ({
    id,
    name,
    lines: lines(name, start),
    track: { start, end: start + 7 },
    refs: { 'ref-listen': { start: start + 2, end: start + 10 }, 'ref-mirrored': { start: start + 2, end: start + 10 } },
    createdAt: created,
  })
  const reflections = opts.withShowtime === false ? [] : [{ id: 'refl-1', at: '2031-03-04T18:00:00.000Z', kind: 'showtime', target: 'run', wentWell: 'I kept going', workOn: 'Breathing' }]
  return {
    schemaVersion: 1,
    setup: { complete: true, persistAsked: true, persisted: true },
    profile: { name: 'Performer', songName: '' },
    show: { name: 'Showcase', date: showDate },
    pastShows: [],
    plan: { startDate, holidayStart: null, holidayEnd: null, schoolMinutes: 45, holidayMinutes: 120, lightWeekday: 0 },
    track: { mediaId: opts.trackMediaId === undefined ? 'media-track-1' : opts.trackMediaId, fileName: 'practice-track.m4a', duration: 182.4, standInYoutubeId: 'JSFG-IE8n_c' },
    refs: [
      { id: 'ref-listen', role: 'listen', label: 'Listen and read', kind: 'youtube', youtubeId: '6DBtz2enWSA', mediaId: null, fileName: '', synced: true, alreadyMirrored: false, mirror: false },
      { id: 'ref-mirrored', role: 'mirrored', label: 'Mirrored follow-along', kind: 'youtube', youtubeId: 'PBhzOdOIFEY', mediaId: null, fileName: '', synced: true, alreadyMirrored: true, mirror: false },
      { id: 'ref-local-1', role: 'local', label: 'Teacher demo', kind: 'local', youtubeId: '', mediaId: 'media-video-1', fileName: 'demo.mov', synced: true, alreadyMirrored: false, mirror: true },
    ],
    sections: [section('v1', 'Verse 1', 2, '2031-03-03T10:00:00.000Z'), section('ch', 'Chorus', 10, '2031-03-03T10:05:00.000Z')],
    tempo: { bpm: 120, offset: 0.5 },
    progress: {
      v1: {
        rap: { done: ['rap-listen', 'rap-say'], fade: 2, finishedAt: null, review: null },
        dance: { done: ['dance-watch'], fade: 0, finishedAt: null, review: null },
        together: { done: [], fade: 0, finishedAt: null, review: null },
        shaky: true,
        shakyDue: '2031-03-05',
      },
    },
    days: { [startDate]: { order: [], done: [`${startDate}-0-warmup`] } },
    reflections,
    settings: {
      faceLabUrl: 'https://jackgao84.github.io/face-lab/',
      upAnywayUrl: 'https://jackgao84.github.io/upanyway/',
      showtimeLyrics: false,
      trackSpeed: 0.85,
      mirrorClips: true,
    },
  }
}
