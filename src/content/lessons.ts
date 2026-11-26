/**
 * The eight skill lessons on her lesson path (version 1.2; Rap basics since 1.2.1). Each is a script the coach reads aloud,
 * word for word as it shows on screen: short sentences, a warm voice, a minute or two each. Each has
 * a video (a grown-up can swap it) and ends by putting her own teachers first. No song or artist is
 * named anywhere. tests/unit/copy.test.ts checks length, sentence length and what each one covers.
 */
import type { LessonVideo, SkillLessonId } from '../storage/schema'

export const TEACHERS_FIRST = 'Your own teachers come first. If they say something different, do it their way.'

export type LessonLink = 'faceLab' | 'upAnyway'

export interface Lesson {
  id: SkillLessonId
  title: string
  minutes: 1 | 2
  paragraphs: string[]
  tryIt: string
  teachersFirst: string
  links: LessonLink[]
  /** The lesson's video, played from `start` (seconds). */
  video: LessonVideo
}

export const LESSONS: readonly Lesson[] = [
  {
    id: 'counting',
    title: 'Counting the music',
    minutes: 1,
    paragraphs: [
      'Hi! Let’s start with counting. Dancers count music in eights. 1, 2, 3, 4, 5, 6, 7, 8. Then it starts again from 1. That’s called an 8-count.',
      'The beat is like a clock that never stops. Nod your head to it. Tap your foot. Each tap is one count.',
      'Every move lands on a count. Every rap line sits on the beat too. So when you know the counts, you always know where you are.',
      'In the video, two dancers show how to find the counts in any song. Listen for the strong beats. The 1 usually feels the strongest. That’s where an 8-count starts.',
      'When you practise here, I count you in. 5, 6, 7, 8. Then the music comes in on the 1.',
    ],
    tryIt: 'Try it: play your track and count out loud. Clap on every 1.',
    teachersFirst: TEACHERS_FIRST,
    links: [],
    video: { youtubeId: 'N6t8hwKp71g', start: 0 },
  },
  {
    id: 'learning-a-dance',
    title: 'Learning a dance',
    minutes: 2,
    paragraphs: [
      'A new dance can feel like a lot. Here’s the secret. You never learn it all at once.',
      'Start slow. Learn the moves at half speed first. Your body remembers moves it does carefully. Then go a bit faster. Then full speed.',
      'Chunk it. Learn one small chunk, like one or two 8-counts. Then chain it. Join the new chunk to the one before. Chunk and chain, again and again, until the whole part flows.',
      'Use the mirrored video. It’s flipped, so it’s like dancing in front of a mirror. When the dancer moves to your left, you move to your left too.',
      'Keep your practice short and focused. A few careful goes help more than lots of rushed ones.',
      'Test yourself. Try a chunk from memory before you peek. Getting stuck is fine. It means your brain is working. Then sleep on it. Your brain saves your moves while you sleep.',
      'In the video, a teacher breaks a dance into small parts. Watch one part, then try it slowly.',
    ],
    tryIt: 'Try it: pick one 8-count. Do it slowly three times. Then chain it to the 8-count before.',
    teachersFirst: TEACHERS_FIRST,
    links: [],
    video: { youtubeId: 'FIl3O1uBjQQ', start: 29 },
  },
  {
    id: 'voice-warm-up',
    title: 'Warming up your voice',
    minutes: 1,
    paragraphs: [
      'Your voice is part of your body. So, just like your legs, it needs a warm-up before you rap.',
      'Start with your breath. In the video, you blow, hiss and breathe out slowly. Copy along. It wakes up the muscles you rap with.',
      'Then hum gently with your lips closed. Do some lip trills, like a little motorboat. Then say red leather, yellow leather, five times. Make every consonant crisp. Consonants are sounds like t, k, p and s.',
      'Sip water before, during and after practice. Your voice works best when you’ve had enough to drink.',
      'No shouting. Use big energy, not a big shout. Your headset mic makes you loud.',
      'If your voice feels croaky or hoarse, or it hurts, rest it. Practise the dance quietly instead, and tell a grown-up.',
    ],
    tryIt: 'Try it: sip some water, then hum gently for ten seconds.',
    teachersFirst: TEACHERS_FIRST,
    links: [],
    video: { youtubeId: 'lNhnpCsoGdQ', start: 0 },
  },
  {
    id: 'rap-basics',
    title: 'Rap basics',
    minutes: 2,
    paragraphs: [
      'Let’s talk about rapping. Rap is rhythm first. The beat is like a clock that never stops, and your words ride on top of it.',
      'Feel the beat before you say a word. Nod your head or tap your foot. Then let each line land right on the beat. If you start to rush, slow down and let the beat carry you.',
      'Make your consonants crisp. Consonants are sounds like t, k, p, s and d. Snap them out clearly, so everyone understands every word.',
      'Know where you breathe. Rap lines can be long and fast. Find the little gaps where a quick breath fits. Mark them in your lines, and breathe in the same place every time.',
      'Bring the energy. Rap with your whole face and body. Smile with your voice. Even quiet lines need energy behind them.',
      'Learn the Korean lines slowly, sound by sound. Take one line at a time. Say it slowly with your track, then a little faster. When one line feels easy, add the next one.',
      'In the video, the words light up as the song plays. Listen first, then read along. Then say the words with it.',
    ],
    tryIt: 'Try it: pick one line. Say it slowly with crisp consonants. Then say it on the beat with your track.',
    teachersFirst: TEACHERS_FIRST,
    links: [],
    video: { youtubeId: '6DBtz2enWSA', start: 0 },
  },
  {
    id: 'breathing',
    title: 'Breathing while you rap and dance',
    minutes: 2,
    paragraphs: [
      'Rapping and dancing at the same time takes lots of breath. So let’s plan your breaths.',
      'Find the gaps. Rap lines can be long and fast. Look for the little gaps where you can take a quick breath. Mark them in your lines, so you breathe in the same place every time.',
      'Breathe on the easier moves. Some moves are big and some are small. Take your breaths during the small, easy ones. Never hold your breath through a hard move.',
      'Breathe low. Let your belly and your ribs open as you breathe in. Keep your shoulders down and relaxed.',
      'Build your stamina. Stamina means having enough energy to last the whole song. Every run-through builds it. Each week it gets a bit easier.',
      'In the video, a singing teacher shares her tips for singing while you dance. Rapping works the same way.',
    ],
    tryIt: 'Try it: rap one line and tap where you breathe. Then do it again with the moves.',
    teachersFirst: TEACHERS_FIRST,
    links: [],
    video: { youtubeId: '6YleE5e4dG8', start: 0 },
  },
  {
    id: 'marking',
    title: 'Marking and full out',
    minutes: 1,
    paragraphs: [
      'Here are two words dancers use a lot. Marking, and full out.',
      'Marking means doing the moves small and soft, at half energy. You still go through every step. You just save your energy.',
      'When you rap and dance together, start by marking. Rap out loud, strong and clear. Mark the moves small. Your words stay strong, and your body learns where the moves go.',
      'Full out means everything, like it’s the show. Big moves, big energy, big face. Go full out once marking feels easy.',
      'Practise with your headset mic or a headband on. Then it feels normal on the day. Keep the mic still, near the corner of your mouth.',
      'In the video, a dancer shows marking and full out, one after the other.',
    ],
    tryIt: 'Try it: mark one part while you rap it. Then do it again full out.',
    teachersFirst: TEACHERS_FIRST,
    links: [],
    video: { youtubeId: 'NLzTkkqRn-s', start: 0 },
  },
  {
    id: 'expressions',
    title: 'Expressions',
    minutes: 1,
    paragraphs: [
      'Your face is part of the dance. Your expressions tell the story of your song.',
      'Think about how your song feels. Confident? Playful? Fierce? Let your face show it.',
      'In the video, a dancer shares three tips for expressions. Try each one while you watch.',
      'Practise in a mirror, or in Face Lab. Try a confident face, then a playful one. Notice how your eyes change too.',
      'Keep your face moving with the music. A face that stays the same all song looks frozen. Small changes make a big difference.',
      'Then watch yourself back. Record a part and look at your face. Pick one moment to make bigger next time.',
    ],
    tryIt: 'Try it: do one 8-count with a confident face. Then do it again with a big smile.',
    teachersFirst: TEACHERS_FIRST,
    links: ['faceLab'],
    video: { youtubeId: 'JTqnJesex7I', start: 0 },
  },
  {
    id: 'performing',
    title: 'Performing',
    minutes: 2,
    paragraphs: [
      'Performing means sharing your song with the people watching. You already know the words and the moves. Now you show them how the song feels.',
      'Think about your eye line. Look up and out, not at the floor. Pick a few spots at the back of the room, just above people’s heads. Move your eyes between them.',
      'Walk on calmly and hit your opening pose. At the end, hold your ending pose, then take a bow.',
      'If you slip, keep going. Nobody in the audience knows the plan. Carry on with the next move or the next line, and smile. Keeping going is what real performers do.',
      'Perform for your family before the show. It might feel a bit scary, and that’s good practice. Performing for someone is a brave thing. You can log it in Up Anyway.',
      'In the video, watch how the performer uses her eyes and her face, and how she keeps going all the way through.',
    ],
    tryIt: 'Try it: do one part for someone at home, with your eyes up and a big expression.',
    teachersFirst: TEACHERS_FIRST,
    links: ['upAnyway'],
    video: { youtubeId: 'XD00TJ-6WSw', start: 0 },
  },
]

export const LESSON_IDS: readonly SkillLessonId[] = LESSONS.map((l) => l.id)

/** The video a lesson plays: a grown-up's swap if there is one, else the lesson's own. */
export function lessonVideo(id: SkillLessonId, swaps: Partial<Record<SkillLessonId, LessonVideo>>): LessonVideo {
  return swaps[id] ?? LESSONS.find((l) => l.id === id)!.video
}
