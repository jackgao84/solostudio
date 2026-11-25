/** Names for the plan's phases and the day's blocks, as she sees them on Today. */
import type { BlockType, Phase } from '../model/plan'

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
  cooldown: { title: 'Cool-down', how: 'Stretch, breathe slowly and rest your voice.' },
}
