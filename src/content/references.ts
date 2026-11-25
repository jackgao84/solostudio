/**
 * The default reference videos a grown-up starts with (all editable in Grown-ups → Videos).
 * YouTube ids only: the app never downloads them, never extracts audio and never shows thumbnails.
 * "Synced" videos play in time with the music, so the section marks can map her track's lyrics and
 * counts onto them; tutorials stop and explain, so they are not synced.
 */
import type { Reference } from '../storage/schema'

function yt(id: string, role: Reference['role'], label: string, synced: boolean, alreadyMirrored = false): Reference {
  return {
    id: `ref-${role}`,
    role,
    label,
    kind: 'youtube',
    youtubeId: id,
    mediaId: null,
    fileName: '',
    synced,
    alreadyMirrored,
    mirror: false,
  }
}

export const DEFAULT_REFS: readonly Reference[] = [
  yt('6DBtz2enWSA', 'listen', 'Listen and read', true),
  yt('JSFG-IE8n_c', 'original', 'Original', true),
  yt('XD00TJ-6WSw', 'performance', 'Performance', true),
  yt('PBhzOdOIFEY', 'mirrored', 'Mirrored follow-along', true, true),
  yt('vVWmbpHj4Eg', 'tutorialFull', 'Tutorial (full)', false),
  yt('FIl3O1uBjQQ', 'tutorialParts', 'Tutorial: chorus and dance break, with counts', false),
  yt('UI4-leflJ00', 'slow', 'Slow music', true),
]
