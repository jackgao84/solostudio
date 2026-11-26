# Solo Studio

A practice room on the iPad for a young performer's first solo: a rap cover performed with a
headset mic while dancing, at a showcase and again at a talent show.

- **Today's plan**, counted back from the show: rap lines and the first dance sections from day one,
  every section learned slowly by about ten days out, rap and dance together after that, full
  run-throughs and performing for family in the last four days. Blocks with a gentle timer: warm-up,
  rap (never more than 20 minutes of voice in a row), dance, water breaks, together, run-throughs,
  cool-down. She can reorder them; the screen stays awake while she practises.
- **Three ladders per section** she ticks herself ("I did it" or "Again"), never scored: rap (listen
  and read at 75%, say it with the words, words fade away, from memory), dance (tutorial, mirrored
  follow-along at 50/75/100%, from memory), and together (marking at half energy, full out, linked
  with the section before). Lines light up karaoke style at any speed, with an 8-count beside them.
- **Quick tests** (missing words, counts from memory) and spaced checks after 1, 3 and 7 days; shaky
  sections come back sooner.
- **Showtime**: the whole routine (backstage breathing with a circle, “I’m excited!”, the walk to her
  spot, the opening pose on a spoken count, her whole track with no stopping, ending pose, bow,
  applause, walking off), with an optional gentle audience made in Web Audio. Then one thing that
  went well, one to work on, and Up Anyway if someone watched. Optional **recording** with a
  mirrored front camera, played back beside the reference.
- **Start today’s practice** (1.1): one big button walks through the day, saying what’s next in the
  coach’s voice (1.2; the iPad’s own voice in 1.1) and counting her in (5, 6, 7, 8) before every rep. Reps loop until she taps
  I did it, Next or Pause, with buttons big enough to hit from a step away. Cues are never spoken
  over her music; cues and sound effects each have a volume and mute.
- **Drills** from the together phase on: start anywhere (a random section, shaky ones more often)
  and jump back in (the music drops out or skips a line and she keeps going). A **listening run** on
  light days. A 30-second tour on first run.
- **Her stage**: each section a lighting rig that lights up as she ticks steps (all lit on show
  day), a light stick in her colour beside the 8-count, a D-day countdown, Build the line, and a
  name and colours for her stage. Celebrations are only ever for doing things.
- **Lessons are the home page** (1.2): the top shows only Start today's practice, the D-day and
  today's lessons; below, her lesson path mixes eight skill lessons (counting, learning a dance, a
  voice warm-up, rap basics, breathing while she raps and dances, marking and full out, expressions,
  performing), each just before the first lesson that needs it, with a Rap, a Dance and a Together
  lesson for every section, each holding that ladder's rungs and its stage lights. Each puts her own
  teachers first.
- **A coach's voice** (1.2): every lesson, cue and count-in is said in one warm recorded voice
  (ElevenLabs, recorded once by `npm run voice` and kept in the repo as small MP3s that work
  offline), word for word what's on screen; she can pause, replay or skip, and a grown-up can turn
  the reading off. Only a custom section name is said in the iPad's own voice.
- **Filming with time to get ready** (1.2): "Get to your spot" with a countdown of her walk-on time,
  then the count-in, then recording; Film my Showtime.
- **Videos with no marking** (1.2): tutorials and the listen-and-read video play from the start (or a
  chapter time), with speed and her own "loop this bit"; marks only cue a video to a section.
- **Grown-ups' area** behind a press-and-hold: **Set up**, a wizard of about 10 minutes that can be
  paused (1.2: her track, all her lines in one box, a tap as each section starts on one play of her
  track; then optionally the follow-along taps, line timing, the beat worked out from her track and
  checked against a click, and the dates, minutes and her walk-on time); her week, notes, lessons
  and narration, and the detailed screens (show and plan, her track, videos, sections, tempo, the
  Showtime routine, backup).

No lyrics, photos or logos are in this repo: a grown-up types the lines on the iPad and they stay
there. YouTube videos play only through YouTube's own player (youtube-nocookie.com). Her track,
videos and clips stay on the iPad; nothing is uploaded and there are no accounts or analytics.

## Put it on an iPad

See **[SETUP.md](SETUP.md)** (about 10 minutes; she can start after the first three steps).

## Work on it

```bash
npm install
npm run dev          # http://localhost:5174/solostudio/
npm run typecheck
npm test             # unit checks
npm run e2e          # Playwright WebKit at iPad portrait and landscape, against a production build
npm run review       # rebuild REVIEW.md after changing any kid-facing words in src/content
npm run voice        # record the coach's narration for new or changed lines (needs ELEVENLABS_API_KEY)
npm run privacy      # privacy scan of every file and commit (private words in .private/terms.txt)
npm run build        # dist/ for GitHub Pages
```

**[REVIEW.md](REVIEW.md)** lists every line of kid-facing text, generated from `src/content`.
**[PROGRESS.md](PROGRESS.md)** explains the architecture, the checks and every decision.

Vite + TypeScript, plain DOM and CSS. An installable offline PWA on GitHub Pages at
`/solostudio/`; every storage key, cache and database is prefixed `solostudio:` because the origin is
shared with other family apps.

## Licence

MIT. See [LICENSE](LICENSE).
