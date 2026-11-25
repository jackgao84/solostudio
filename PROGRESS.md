# Solo Studio — PROGRESS

> Single source of truth for resuming work. A fresh session should be able to continue from this
> file alone. Keep **Status**, **Stages** and **Decisions** current at the end of every stage.
> The owner's original brief (with personal details) is in `.private/BRIEF.md` (gitignored, local
> only); `.private/terms.txt` lists words the privacy scan looks for. Neither is ever committed.

## Status

- **Paused for the owner (2026-11-25):** the lyric-placeholder unit check (`tests/unit/lyrics.test.ts`)
  is wrong: it flags its own source. (1) Its Korean-script regex was written with literal Hangul
  characters instead of `\u` escapes, so "no Korean script in any file" finds the check itself.
  (2) Its header comment contains example patterns (`lyric: '…'`, `typeLyric(locator, '…'`) that
  the placeholder scan then matches (all 6 hits are in that comment; no other file has a hit).
  Proposed fix (needs the owner's OK, per the brief): write the regex with `\u` escapes and reword
  the comment. Nothing about what is checked would change.
- Also disclosed: `tests/unit/sync.test.ts` had an unused loop variable `s` that failed the
  typecheck (noUnusedParameters); it was renamed to `_s`. No assertion changed.
- Everything else: unit checks 148/150 passing (the 2 failures are the lyric check above).
  Typecheck clean. The WebKit suite has not been run yet. Nothing pushed; no GitHub repo yet.

## Stages

1. [x] Read Up Anyway conventions (via gh) and probe WebKit (audio speed + preservesPitch, wake lock,
   MediaRecorder from a canvas stream, iframe routing; Blobs can't be stored in Playwright WebKit's
   private IndexedDB, so media falls back to ArrayBuffers there).
2. [x] Scaffold: Vite + TypeScript, plain DOM/CSS, service worker plugin and template, base
   `/solostudio/`, Playwright WebKit at iPad portrait 820×1180 and landscape 1180×820.
3. [x] Checks first (commit 095d4bc): 17 unit test files and 10 WebKit specs (see below).
4. [~] Core logic against the unit checks: done (dates, timing, sync, counts, fade, quiz, spacing,
   ladders, progress, plan, shows, clips, storage, backup, media, YouTube helpers, copy, lessons).
5. [~] Screens: all written (kid: welcome, today, block, practice, sections, section, quick tests,
   showtime, record, clips, lessons; grown-ups: home, plan, track, videos, sections, section
   editor with marks and tap-along, tempo, backup, links). WebKit suite not yet run.
6. [ ] Docs: README, SETUP.md (one-time setup, ~30 min), REVIEW.md (generated: `npm run review`),
   DEPLOY notes, LICENSE.
7. [ ] Privacy scan (`npm run privacy`, terms from `.private/terms.txt`) of the tree and every commit
   message; create public repo jackgao84/solostudio with the noreply identity; push.
8. [ ] Pages (GitHub Actions), confirm live site and service worker; report check summaries.

## Commands

```bash
npm install
npm run dev          # http://localhost:5174/solostudio/
npm run typecheck
npm test             # unit checks (vitest)
npm run e2e          # Playwright WebKit, iPad portrait + landscape, against a production build
npm run review       # rebuild REVIEW.md after changing kid-facing words in src/content
npm run icons        # redraw public/icons from scripts/make-icons.mjs
npm run privacy      # privacy scan of the tree and commit messages (needs .private/terms.txt)
npm run build        # dist/ for GitHub Pages
```

## The checks (what decides "done")

Unit (`tests/unit`): timing, sync (line sync at every speed 50–100%), counts (tap tempo at every
speed, 8-count), fade (a few words at a time, spread out, first word stays), spacing (1/3/7 days,
shaky sooner), ladders, plan (phases, minutes, voice ≤ 20 min in a row, water ≤ 30 min apart,
light days, headset reminders, her reordering, reset), storage (prefix, recovery, backup without
media, IndexedDB Blob + ArrayBuffer fallback, persist()), clips (newest 3), quiz, youtube rules,
app (version line, busy routes, gate), dates, lyrics (placeholders only, no Korean script, no
network), copy (no grading words, short sentences, lessons), review-md (REVIEW.md current),
source-rules (storage names, no YouTube transforms, no personal details).

WebKit (`e2e`): journey (first launch → Showtime), practice, youtube (errors 150/101, swap, local
mirrored video), today (reorder + voice rule, timer, wake lock, light day, reset), recording
(mirrored preview, newest 3, run-throughs), backup (export/import), offline (real service worker,
shared origin), update ("New version" never mid-practice), layout (every screen, both
orientations), lessons links. Stand-ins: YouTube API + nocookie embed (routed), camera (canvas
stream), wake lock and persist() (recorded), file picking (setInputFiles with generated WAV/MP4).
Service workers are blocked except in the offline and update specs (routing needs that).

## Architecture

- `src/model/` pure logic, fully unit-tested. `src/storage/` keys (all `solostudio:`), schema,
  normalize, store (localStorage), backup, media (IndexedDB `solostudio:media`, stores `media` and
  `meta`), persist.
- `src/media/` players: her track (one shared `<audio class="track-audio">`, preservesPitch),
  YouTube (IFrame API, host youtube-nocookie.com, playsinline), local video (optional mirror),
  `RangePlayer` (play a section range at a speed, tick every frame).
- `src/ui/` shared components (no copy inline), lyrics panel, counts, reflect, video helpers.
- `src/screens/kid/` her screens; `src/screens/grownups/` behind a 2 s press-and-hold.
- `src/content/` every kid-facing string (REVIEW.md is generated from it).
- Service worker: Up Anyway's pattern (precache, `solostudio:precache:<hash>`, update waits,
  "New version" button on Today, never reloads on practice routes).

## Decisions

1. No song title, artist name, lyrics, photos or logos anywhere in the repo; the song name is an
   optional setup field. Default video ids only.
2. Plan phases: learn while ≥ 11 days out, together 10–5, show-ready 4–1, show day 0. Light day =
   the chosen weekday, the day before the show and show day. Water breaks count as voice rest.
3. Warm-up, water and cool-down are pinned; she moves the other blocks; a move that breaks the
   voice or water rule is refused with a note.
4. Spacing is per ladder: finished → due +1, +3, +7, then every 7. Shaky → tomorrow, back to +1.
5. Fade: odd-placed words first (never two side by side until half are hidden), first word last.
6. Clips are saved as soon as recording stops; the newest 3 per group are kept.
7. Showtime with a YouTube stand-in shows that player (it can't play hidden); with her track, no video.
