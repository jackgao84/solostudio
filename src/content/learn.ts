/**
 * Section lessons (version 1.2): one Rap, one Dance and one Together lesson for each of her sections,
 * each holding that ladder's rungs. The short intro is read aloud by the coach, so it never names a
 * section (a custom name would need the iPad's voice); the lesson's title is the section and ladder.
 * Version 1.4: the rap ladder fades the singer's voice (a voice guide, then karaoke, then memory).
 */
import type { LadderId } from '../storage/schema'

export const SECTION_LESSON_COPY: Record<LadderId, { intro: string[] }> = {
  rap: {
    intro: [
      'This is a rap lesson. First, listen and read along as the words light up.',
      'Then rap along while the voice gets softer, and then with no voice at all.',
      'Last, rap it from memory. I count you in every time.',
    ],
  },
  dance: {
    intro: [
      'This is a dance lesson. Watch the tutorial first, and try the moves slowly.',
      'Then follow the mirrored video, at half speed, then faster.',
      'Last, dance it from memory, with just your track.',
    ],
  },
  together: {
    intro: [
      'Now you put the words and the moves together.',
      'Start by marking the moves small while you rap out loud.',
      'Then go full out, and link it to the part before.',
    ],
  },
}
