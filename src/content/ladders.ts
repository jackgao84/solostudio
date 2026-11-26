/** Names and how-tos for the three ladders and every rung. */
import type { Source, StepDef } from '../model/ladders'
import type { LadderId } from '../storage/schema'

export const LADDER_COPY: Record<LadderId, { name: string; about: string }> = {
  rap: { name: 'Rap', about: 'From listening to rapping it from memory.' },
  dance: { name: 'Dance', about: 'From the tutorial to dancing it from memory.' },
  together: { name: 'Rap and dance together', about: 'From marking it softly to full out.' },
}

export const STEP_COPY: Record<string, { name: string; how: string }> = {
  'rap-listen': { name: 'Listen and read', how: 'Listen and follow the words as they light up.' },
  'rap-say': { name: 'Say it with the words', how: 'Rap along with your track while the words light up.' },
  'rap-fade': { name: 'Words fade away', how: 'A few words hide each time. Keep rapping them anyway.' },
  'rap-memory-75': { name: 'From memory, slow', how: 'No words now. Rap it from memory over your track.' },
  'rap-memory-100': { name: 'From memory, full speed', how: 'From memory at full speed. You’ve got this.' },
  'dance-watch': { name: 'Watch the tutorial', how: 'Watch this part and try the moves slowly.' },
  'dance-follow-50': { name: 'Follow at half speed', how: 'Follow the mirrored video, nice and slow.' },
  'dance-follow-75': { name: 'Follow a bit faster', how: 'Follow the mirrored video a bit faster.' },
  'dance-follow-100': { name: 'Follow at full speed', how: 'Follow the mirrored video at full speed.' },
  'dance-memory': { name: 'Dance from memory', how: 'Just your track, no video. Dance it from memory.' },
  'together-mark-75': { name: 'Mark it, slow', how: 'Rap out loud and mark the moves small, at half energy.' },
  'together-mark-100': { name: 'Mark it, full speed', how: 'Same again at full speed, still at half energy.' },
  'together-full-100': { name: 'Full out', how: 'Rap and dance full out, like it’s the show.' },
  'together-linked': { name: 'Link it up', how: 'Start in the part before and flow straight into this one.' },
}

/**
 * The rap rungs that fade the singer's voice (version 1.4). With no guide file: the karaoke videos,
 * named for what they play. With a guide file: her track with the voice turned down, then off.
 */
export const RAP_VIDEO_STEP_COPY: Record<'voiceGuide' | 'karaoke', { name: string; how: string }> = {
  voiceGuide: { name: 'Say it with Voice guide', how: 'Rap along with Voice guide. Its voice is soft, so yours leads.' },
  karaoke: { name: 'Say it with Karaoke', how: 'Rap along with Karaoke. No voice now, just yours.' },
}

export const RAP_GUIDE_STEP_COPY: Record<string, { name: string; how: string }> = {
  'rap-listen': { name: 'Listen and read', how: 'Listen to the voice and follow the words.' },
  'rap-say': { name: 'Say it with a light voice', how: 'The voice is turned down low. Rap along, and let yours lead.' },
  'rap-fade': { name: 'Say it with no voice', how: 'No voice now. A few words hide each time. Keep rapping them anyway.' },
}

/** A rung's name and how-to for what it plays: a karaoke video, her track with the guide, or as before. */
export function stepCopyFor(step: Pick<StepDef, 'id'>, source: Source, mode: 'guide' | 'videos' = 'videos'): { name: string; how: string } {
  if (source === 'voiceGuide' || source === 'karaoke') return RAP_VIDEO_STEP_COPY[source]
  if (mode === 'guide' && RAP_GUIDE_STEP_COPY[step.id]) return RAP_GUIDE_STEP_COPY[step.id]
  return STEP_COPY[step.id]
}
