/** Names for the plan's phases and the day's blocks, as she sees them on Today. */
import type { BlockType, Drill, Phase } from '../model/plan'

export const PHASE_COPY: Record<Phase, { name: string; about: string }> = {
  learn: { name: 'Learning the parts', about: 'Rap lines and dance moves, one section at a time, slowly.' },
  together: { name: 'Putting it together', about: 'Rapping while you dance, section by section.' },
  showReady: { name: 'Show ready', about: 'Whole run-throughs, and performing for your family.' },
  showDay: { name: 'Show day!', about: 'Warm up gently, sip water, and enjoy it.' },
}

export const BLOCK_COPY: Record<BlockType, { title: string; how: string }> = {
  warmup: { title: 'Warm-up', how: 'Wake up your body and your voice.' },
  rap: { title: 'Rap', how: 'Work on your rap lines.' },
  dance: { title: 'Dance', how: 'Learn and practise the moves.' },
  water: { title: 'Water break', how: 'Have a few sips of water and rest your voice.' },
  together: { title: 'Rap and dance together', how: 'Put the words and the moves together.' },
  runthrough: { title: 'Run-through', how: 'The whole song from the top, no stopping.' },
  family: { title: 'Perform for your family', how: 'Show someone at home. That’s a brave thing!' },
  listen: { title: 'Listening run', how: 'Close your eyes and listen to your track. Imagine you are on stage doing it.' },
  cooldown: { title: 'Cool-down', how: 'Stretch, breathe slowly and rest your voice.' },
}

/** The drills: rap-and-dance-together blocks from the together phase on. */
export const DRILL_COPY: Record<Drill, { title: string; how: string }> = {
  anywhere: { title: 'Start anywhere', how: 'Land in a random part and rap and dance from there.' },
  rejoin: { title: 'Jump back in', how: 'If the music stops or skips, keep going and pick it back up.' },
}

/** A block's name and how-to (a drill's own, or its type's). */
export function blockCopy(b: { type: BlockType; drill?: Drill }): { title: string; how: string } {
  return b.drill ? DRILL_COPY[b.drill] : BLOCK_COPY[b.type]
}
