/**
 * The default reference videos a grown-up starts with (all editable in Grown-ups → Videos).
 * YouTube ids only: the app never downloads them, never extracts audio and never shows thumbnails.
 * "Synced" videos play in time with the music, so the section marks can map her track's lyrics and
 * counts onto them; tutorials stop and explain, so they are not synced.
 * Version 1.4 adds "Voice guide (light)" (the singer's voice turned down low) and "Karaoke (no voice)",
 * both with the words on screen, named as the practice room shows them.
 */
import type { Reference } from '../storage/schema'
import { KID_COPY } from './kid'

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
  // Version 1.4: two karaoke videos under their own names, for the rap ladder's fading voice.
  yt('81BPeeksFqo', 'voiceGuide', KID_COPY.room.sourceVoiceGuide, true),
  yt('a03UskoIMxw', 'karaoke', KID_COPY.room.sourceKaraoke, true),
]

/** The roles of the seven videos 1.0 to 1.3 started with: a grown-up can swap or rename them, not remove them. */
export const CORE_ROLES = ['listen', 'original', 'performance', 'mirrored', 'tutorialFull', 'tutorialParts', 'slow'] as const
