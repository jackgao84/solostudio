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
- **Showtime**: her whole track from the top, no stopping, then one thing that went well and one to
  work on. Optional **recording** with a mirrored front camera, played back beside the reference.
- **Lessons**: six short reads, each putting her own teachers first.
- **Grown-ups' area** behind a press-and-hold: the show and plan, her track, reference videos,
  sections with typed lines, marks and tap-along, tempo, backup.

No lyrics, photos or logos are in this repo: a grown-up types the lines on the iPad and they stay
there. YouTube videos play only through YouTube's own player (youtube-nocookie.com). Her track,
videos and clips stay on the iPad; nothing is uploaded and there are no accounts or analytics.

## Put it on an iPad

See **[SETUP.md](SETUP.md)** (about 30 minutes, once).

## Work on it

```bash
npm install
npm run dev          # http://localhost:5174/solostudio/
npm run typecheck
npm test             # unit checks
npm run e2e          # Playwright WebKit at iPad portrait and landscape, against a production build
npm run review       # rebuild REVIEW.md after changing any kid-facing words in src/content
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
