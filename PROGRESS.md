# Solo Studio — PROGRESS

> Single source of truth for resuming work. A fresh session should be able to continue from this
> file alone. Keep **Status**, **Stages** and **Decisions** current at the end of every stage.
> The owner's original brief (with personal details) is in `.private/BRIEF.md` (gitignored, local
> only); `.private/terms.txt` lists words the privacy scan looks for. Neither is ever committed.

## Status

- **Done and live (2026-11-26): https://jackgao84.github.io/solostudio/** (public repo
  jackgao84/solostudio, Pages from GitHub Actions; the workflow runs the unit checks before building).
  Confirmed in WebKit against the live site: the service worker takes control at `/solostudio/`,
  one `solostudio:precache:<hash>` cache, only `solostudio:` storage keys, no console errors.
  YouTube's oEmbed reports all seven default videos as embeddable (200).
- Final checks: typecheck clean; unit 150/150 in 17 files; Playwright WebKit 48/48 (24 tests × iPad
  portrait and landscape), twice in a row, no retries; REVIEW.md current; privacy scan clean
  (every file, every commit message, author and committer; all commits by the noreply identity).
- Only the iPad can confirm: each default video plays inside the app, the camera records, her track
  keeps its pitch at 50–75%, and the screen stays awake (iPadOS 16.4+). SETUP.md lists these.
- **Check changes, all approved by the owner and committed on their own:**
  - `tests/unit/sync.test.ts`: an unused loop variable `s` renamed `_s` (typecheck only).
  - `tests/unit/lyrics.test.ts` (576283b): it flagged its own source. Its Korean-script pattern is
    now written with `\u` escapes and two comments no longer contain the patterns it scans for.
  - `e2e/helpers.ts`, `e2e/offline.spec.ts`, `e2e/update.spec.ts` (24767b2): the camera and
    persist() stand-ins are installed on `MediaDevices.prototype` / `StorageManager.prototype`
    (Playwright's WebKit drops overrides on the navigator objects ~2 s after load); the offline and
    update specs seed no YouTube stand-in (routing can't reach a worker-controlled page).
  No assertion was changed anywhere.

## Version 1.1 (in progress)

The owner's update brief for 1.1 (start anywhere, rejoin, the Showtime routine, the grown-ups'
week, the listening run, a guided session with spoken cues, and the stage lights) is worked through
part by part: checks first, then the code, a commit after each part.

1. [x] Save version 2 with a tested migration from 1.0 (`src/storage/migrate.ts`; checks
   `tests/unit/migration.test.ts`, `e2e/migration.spec.ts`, fixture `tests/fixtures/v1-save.ts`).
   A 1.0 save loads unchanged with the new parts at their defaults; the 1.0 document is kept as
   the backup copy before the new one is written, once; 1.0 backup files still import.
2. [x] Start anywhere and jump back in (rejoin), in the plan from the together phase on
   (`src/model/drills.ts`, `src/model/countin.ts`, `src/media/reploop.ts`, `src/screens/kid/drill.ts`;
   checks `tests/unit/drills.test.ts`, `tests/unit/routes-v11.test.ts`, `e2e/drills.spec.ts`, with a
   speech stand-in in `e2e/voice.ts`).
3. [x] The Showtime routine, audience sound, walk-on and bow on their own (`src/model/routine.ts`,
   `src/audio/audience.ts`, `src/audio/sfx.ts`, `src/screens/kid/showtime.ts`, Grown-ups →
   Showtime routine; checks `tests/unit/showtime-routine.test.ts`, `e2e/showtime-routine.spec.ts`).
4. [x] Grown-ups' week, teacher notes per section, a note for her on Today (`src/model/week.ts`,
   `src/model/activity.ts`, `src/app/activity.ts`, Grown-ups → Her week and Notes; checks
   `tests/unit/week.test.ts`, `e2e/grownups-week.spec.ts`).
5. [x] Listening run on light days (block type `listen` in `src/model/plan.ts`,
   `src/screens/kid/listen.ts`; checks `tests/unit/listening.test.ts`, `e2e/listening.spec.ts`).
6. [x] Ease of use: guided session, spoken cues and count-ins, looping reps, sound settings, tour
   (`src/model/session.ts`, `src/app/session.ts`, `src/screens/kid/sounds.ts`, `tour.ts`, practice
   and drill screens on `RepLoop`; checks `tests/unit/session.test.ts`, `e2e/session.spec.ts`,
   `e2e/reach.spec.ts`).
7. [ ] Fun: stage lights, light stick, D-day, build the line, celebrations, her stage's name and colours.
8. [ ] Docs (REVIEW.md, SETUP.md), full checks, screens in both orientations, version 1.1.0, deploy.

Decisions (1.1):

- D1. Drills are rap-and-dance-together blocks (`type: 'together'` plus `drill`), so the voice rule,
  water gaps and headset reminders apply unchanged and no 1.0 plan check moves. They take a small
  share of together-phase and show-ready days (the first to go on a short day); none while learning.
- D2. Start anywhere: shaky sections weigh 3, never the same section twice in a row, from the
  section's start at 100%; the video option uses the mirrored follow-along. Jump back in: one event
  per rep, a drop-out of 2–4 s (muted, so her track keeps its place; iPadOS ignores volume) or a jump
  from inside a line to the next line's start, from 1 s before the section.
- D3. Count-in: 1.5 s to get to her spot, then "5, 6, 7, 8" at her track's tempo × speed (kept
  between 0.4 and 1 s a beat; 0.6 s with no tempo); the music comes in on the 1. Timed by the app,
  never by speech events (Playwright's WebKit has no voices and never ends an utterance).
- D4. Cues are never spoken while her track, a video or a YouTube player plays (`mediaPlaying()`);
  a YouTube player counts as paused as soon as it is told to pause.

- D5. Showtime routine: breaths (default 3) and seconds to walk to her spot (default 8) are set in
  Grown-ups → Showtime routine. The opening pose is "Opening pose", then "5, 6, 7, 8" at her
  track's tempo, and the track comes in on the 1. The crowd plays from "I'm excited!" and fades as
  the pose count starts; the applause starts with the bow. Neither ever plays during her track.
- D6. The applause is one fixed buffer made from a fixed seed (`applauseSamples(sampleRate)` takes
  nothing else), so nothing about how she did can change it. Only `crowd` and `applause` exist.
- D7. The Showtime player stays in one place in the page and is shown or hidden (a moved YouTube
  iframe reloads). Up Anyway is offered after a plain Showtime with "Someone watched me"; performing
  for family offers it straight away, as before.

- D8. Minutes practised are logged in 5 s steps while a practice screen is on screen and she is
  active (media playing, or a tap in the last 10 minutes); a screen left open untouched adds
  nothing. A day counts as practised with a minute or more, a ticked step, a finished block or a
  reflection. The log keeps 120 days.
- D9. The note for her shows on Today until she taps Got it; the grown-up's Notes screen says when
  she has seen it. Teacher notes show beside the lyrics and counts on that section's practice
  screens, never over a player.

- D10. The listening run is 4 minutes (3 on days under 25 minutes), after the day's practice and
  before the cool-down, on every light day (the weekly one, the day before the show, show day). It
  is not a voice block and she can move it. A cue to close her eyes, 3.5 s to settle, her whole
  track with nothing on screen but a soft glow, then a cue to open them.

- D11. The guided session is in memory: each item opens its usual screen with `?session=1`, which
  says the item's cue and calls `sessionNext()` on I did it or Next; a block is marked done as she
  leaves its last item. A reload simply ends the session. Practice blocks give one item per section
  (`practiceChoices`, shared with the block screen). In the session, reps, drills, the listening
  run and Showtime start by themselves after the cue; warm-up, water and cool-down wait for Next.
- D12. Every practice screen loops: Play → count-in → the rep → 1.5 s rest → count-in → again,
  until Pause, Again/Next or I did it. "From the start" is gone (Again does it). The main buttons
  are 96 px tall and share one row; the count-in shows in the row below them so nothing moves.
  A cue's gap before the count-in grows with its length (65 ms a character, at least 1.4 s).
- D13. Today has one primary button, Start today's practice (Showtime and the block Start buttons
  are plain). The tour is offered on Today (Take the tour / Not now), never forced, five slides of
  6 s read out loud. Sounds: five volume steps each for cues and effects, plus mute.
- D14. On Showtime's start view a stand-in video is hidden until her track plays, so Start is in
  reach in landscape too.

**Check change approved by the owner (1.1):** `e2e/journey.spec.ts` steps 13–14: only the waits
grow by the Showtime routine's length (the routine now comes before and after her track); every
assertion stays.

## Stages (1.0)

1. [x] Read Up Anyway conventions (via gh) and probe WebKit.
2. [x] Scaffold: Vite + TypeScript, plain DOM/CSS, service worker, `/solostudio/`, Playwright WebKit.
3. [x] Checks first (commit 095d4bc): 17 unit test files and 10 WebKit specs.
4. [x] Core logic against the unit checks.
5. [x] Screens against the WebKit checks.
6. [x] Docs: README, SETUP.md, REVIEW.md (generated), PROGRESS.md, LICENSE, deploy workflow.
7. [x] Privacy scan clean; public repo jackgao84/solostudio created with the noreply identity; pushed.
8. [x] Pages (GitHub Actions) on; live site and service worker confirmed.

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
8. App fixes found by the WebKit suite: selects drawn at full height (WebKit ignores a default
   select's height); tap-along offers "Next line" only once her track is really moving, with a
   200 ms real-time double-tap guard and a 0.15 s media-time gap (WebKit's media clock stalls
   briefly); the camera's tracks are held until she leaves; media blob URLs are released a moment
   after the element lets go (revoking early logs a WebKit load error).
9. Practice layout: in landscape the player, its controls and "I did it" sit on the left, lyrics
   and counts on the right, all on one screen; in portrait the player is capped at 34vh.
10. Her track plays at 50–100% in 5% steps (Slower / Faster on the practice screen); YouTube offers
    50%, 75% and 100%. The original video stands in for her track on a fresh install.
11. The page background lives on `html` so the room (mirror panels, LED strip) painted by
    `body::before` shows through.
