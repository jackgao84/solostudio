# Solo Studio — PROGRESS

> Single source of truth for resuming work. A fresh session should be able to continue from this
> file alone. Keep **Status**, **Stages** and **Decisions** current at the end of every stage.
> The owner's original brief (with personal details) is in `.private/BRIEF.md` (gitignored, local
> only); `.private/terms.txt` lists words the privacy scan looks for. Neither is ever committed.

## Status

- **Built and checked locally (2026-11-26).** Typecheck clean; unit checks 150/150 in 17 files;
  Playwright WebKit 48/48 (24 tests × iPad portrait and landscape), twice in a row with no retries;
  REVIEW.md current; privacy scan clean (122 files, every commit message, author and committer).
- **Check changes, all approved by the owner and committed on their own:**
  - `tests/unit/sync.test.ts`: an unused loop variable `s` renamed `_s` (typecheck only).
  - `tests/unit/lyrics.test.ts` (576283b): it flagged its own source. Its Korean-script pattern is
    now written with `\u` escapes and two comments no longer contain the patterns it scans for.
  - `e2e/helpers.ts`, `e2e/offline.spec.ts`, `e2e/update.spec.ts` (24767b2): the camera and
    persist() stand-ins are installed on `MediaDevices.prototype` / `StorageManager.prototype`
    (Playwright's WebKit drops overrides on the navigator objects ~2 s after load); the offline and
    update specs seed no YouTube stand-in (routing can't reach a worker-controlled page).
  No assertion was changed anywhere.
- Next: create the public repo, push, turn on Pages, confirm the live site and service worker.

## Stages

1. [x] Read Up Anyway conventions (via gh) and probe WebKit.
2. [x] Scaffold: Vite + TypeScript, plain DOM/CSS, service worker, `/solostudio/`, Playwright WebKit.
3. [x] Checks first (commit 095d4bc): 17 unit test files and 10 WebKit specs.
4. [x] Core logic against the unit checks.
5. [x] Screens against the WebKit checks.
6. [x] Docs: README, SETUP.md, REVIEW.md (generated), PROGRESS.md, LICENSE, deploy workflow.
7. [ ] Privacy scan (done locally, clean), create public repo jackgao84/solostudio, push.
8. [ ] Pages (GitHub Actions), confirm live site and service worker.

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
