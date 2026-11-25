/** The simple steps for warm-up, water breaks and cool-down. */
export interface Routine {
  title: string
  steps: string[]
}

export const ROUTINES: Record<'warmup' | 'water' | 'cooldown', Routine> = {
  warmup: {
    title: 'Warm-up',
    steps: [
      'Roll your shoulders back ten times, then forward ten times.',
      'Look left, look right, then nod slowly. Keep your neck gentle.',
      'March on the spot and swing your arms for a minute.',
      'Hum a gentle note with your lips closed. Feel the buzz.',
      'Lip trills: blow through loose lips like a motorboat, sliding up and down.',
      'Say “red leather, yellow leather” five times, crisp and clear.',
      'A few small bounces and toe taps. Now you’re ready!',
    ],
  },
  water: {
    title: 'Water break',
    steps: ['Have a few sips of water.', 'Breathe in through your nose and slowly out through your mouth.', 'Rest your voice for a minute.'],
  },
  cooldown: {
    title: 'Cool-down',
    steps: [
      'Walk around slowly and let your breathing settle.',
      'Stretch your calves, then your thighs. Hold each one for a slow count of ten.',
      'Reach up tall, then fold forward gently.',
      'Sip some water.',
      'Hum softly for a few seconds, then rest your voice.',
    ],
  },
}
