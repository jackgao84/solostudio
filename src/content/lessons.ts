/**
 * Six short reads (a minute or two each) for a young trainee. Each ends by putting her own teachers
 * first. Kept in plain, short sentences; tests/unit/copy.test.ts checks length and coverage.
 */
export const TEACHERS_FIRST = 'Your own teachers come first. If they say something different, do it their way.'

export type LessonLink = 'faceLab' | 'upAnyway'

export interface Lesson {
  id: string
  title: string
  minutes: 1 | 2
  paragraphs: string[]
  tryIt: string
  teachersFirst: string
  links: LessonLink[]
}

export const LESSONS: readonly Lesson[] = [
  {
    id: 'learning-a-dance',
    title: 'Learning a dance',
    minutes: 2,
    paragraphs: [
      'Dancers count music in 8 counts. Count along: 1, 2, 3, 4, 5, 6, 7, 8. Then it starts again. Each move lands on a count. When you know the counts, you always know where you are.',
      'A mirrored video helps you copy. It is flipped, so when the dancer moves to your left, you move to your left too. Just copy it like a mirror. No turning things around in your head!',
      'Start slow. Learn the moves at half speed first. Your body remembers moves it does carefully. Then try them a bit faster, and then at full speed.',
      'Chunk it. Don’t learn the whole dance at once. Learn one small part, like one or two 8 counts. Then chain it: join the new chunk to the chunk before. Chunk and chain, again and again, until the whole section flows.',
      'Keep your moves clean and sharp. Hit each pose, then move on. Big, clear moves look great from the audience.',
    ],
    tryIt: 'Try it: pick one 8 count. Do it at half speed three times. Then join it to the 8 count before.',
    teachersFirst: TEACHERS_FIRST,
    links: [],
  },
  {
    id: 'rap-basics',
    title: 'Rap basics',
    minutes: 2,
    paragraphs: [
      'Rap is rhythm first. The beat is like a clock that never stops. Your words sit on the beat. Nod your head or tap your foot to feel it.',
      'Make your consonants crisp. Consonants are sounds like t, k, p, s and d. Snap them out clearly, so people understand every word. Lazy consonants turn words into mush.',
      'Plan your breaths. Rap lines can be long and fast. Find the gaps where you can take a quick breath. Mark them in your lines, so you breathe in the same place every time.',
      'Bring the energy. Rap with your whole face and body. Smile with your voice. Even quiet lines need energy behind them.',
      'Korean lines work the same way. Learn them slowly, sound by sound. Say them with your track at a slow speed first. Then speed up bit by bit.',
    ],
    tryIt: 'Try it: say one line slowly with super crisp consonants. Then say it on the beat with your track.',
    teachersFirst: TEACHERS_FIRST,
    links: [],
  },
  {
    id: 'rapping-while-dancing',
    title: 'Rapping while dancing',
    minutes: 2,
    paragraphs: [
      'Rapping and dancing at the same time is hard for everyone at first. Your brain has two jobs. So you build it up step by step.',
      'Start by marking. Marking means doing the moves small and soft, at half energy, while you rap out loud. Your words stay strong, and your body learns where the moves go.',
      'Breathe on the easier moves. Some moves are big and some are small. Take your breaths during the small, easy moves. Never hold your breath through a hard move.',
      'Build your stamina. Stamina means having enough energy to last the whole song. Full run-throughs build it. Each week it gets a bit easier.',
      'Practise with your headset mic or a headband on, so it feels normal on the day. Keep the mic still near the corner of your mouth. Don’t touch it or fiddle with it while you dance.',
    ],
    tryIt: 'Try it: rap one section out loud while you mark the moves. Then try it again full out.',
    teachersFirst: TEACHERS_FIRST,
    links: [],
  },
  {
    id: 'performing',
    title: 'Performing',
    minutes: 2,
    paragraphs: [
      'Performing means sharing your song with the people watching. You already know the words and moves. Now you show them what the song feels like.',
      'Think about your eye line. Look up and out, not at the floor. Pick a few spots at the back of the room, a bit above people’s heads. Move your eyes between them.',
      'Use your face. Your expressions tell the story. A confident song needs a confident face. Practise in a mirror, or try Face Lab for expression practice.',
      'If you slip, keep going. Nobody in the audience knows the plan. Carry on with the next move or the next line, and smile. Keeping going is what real performers do.',
      'Perform for your family before the show. It might feel a bit scary, and that’s good practice. Performing for someone is a brave thing. You can log it in Up Anyway.',
    ],
    tryIt: 'Try it: do one section for someone at home, with your eyes up and a big expression.',
    teachersFirst: TEACHERS_FIRST,
    links: ['faceLab', 'upAnyway'],
  },
  {
    id: 'voice-care',
    title: 'Voice care',
    minutes: 1,
    paragraphs: [
      'Your voice is part of your body, so look after it.',
      'Drink water. Sip water before, during and after practice. Your voice works best when you have had enough to drink.',
      'No shouting. Shouting and screaming strain your voice. Use big energy, not a big shout. Let your headset mic make you loud.',
      'Rest when you are hoarse. If your voice sounds croaky or scratchy, or it hurts, rest it. Practise the dance quietly instead, and tell a grown-up.',
      'Don’t rap for too long in a row. Your voice needs little rests. That’s why your plan puts dance or a water break between rap times.',
    ],
    tryIt: 'Try it: before you practise today, sip some water and hum gently for ten seconds.',
    teachersFirst: TEACHERS_FIRST,
    links: [],
  },
  {
    id: 'practising-smart',
    title: 'Practising smart',
    minutes: 2,
    paragraphs: [
      'Smart practice works better than long practice. Here are some tricks that really help.',
      'Keep reps short and focused. Pick one small part and practise it a few times with all your attention. Then take a break. Short, focused practice sticks better than going over and over without thinking.',
      'Test yourself. Reading the words again feels easy, but it doesn’t help much. Trying to remember them helps a lot. That’s why the words fade away, and why there are quick tests. Getting stuck is fine. It means your brain is working.',
      'Sleep on it. Your brain saves what you practised while you sleep. A good night’s sleep after practice really helps you remember.',
      'Come back to it. Parts you learned a few days ago come back for a quick check. If a part feels shaky, mark it, and it comes back sooner.',
    ],
    tryIt: 'Try it: test yourself on one section from memory before you look at the words.',
    teachersFirst: TEACHERS_FIRST,
    links: [],
  },
]

export const LESSON_IDS: readonly string[] = LESSONS.map((l) => l.id)
