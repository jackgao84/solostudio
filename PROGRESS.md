# Solo Studio — PROGRESS

> Single source of truth for resuming work. A fresh session should be able to continue from this
> file alone. Keep **Status**, **Stages** and **Decisions** current at the end of every stage.
> The owner's original brief (with personal details) is in `.private/BRIEF.md` (gitignored, local
> only); `.private/terms.txt` lists words the privacy scan looks for. Neither is ever committed.

## Status

- **Version 1.4 in progress** (see "Version 1.4" below): part 1 built; part 2 next.

- **Version 1.3.0 done and live (2026-11-26), build 75e988e:** practice that needs no setup (see
  "Version 1.3" below). Confirmed in WebKit against the live site at iPad portrait and landscape: "Version
  1.3.0 · build 75e988e"; one `solostudio:precache:<hash>` cache of 227 files (218 clips); a fresh iPad
  opens on the welcome, reaches the practice room (7 videos), saves a part, and then opens on home with
  the part on her path; Test YouTube says it works; a 1.2 save carries over (save version 4, everything
  kept, no parts, the 1.2 document as the backup copy); no console errors. The deploy workflow's unit
  checks passed (38 files, 346).
- 1.3.0 final checks: typecheck clean; unit 346/346 in 38 files; privacy scan clean; Playwright WebKit
  (84 tests × iPad portrait and landscape): 168/168 on a clean run (10.1 min). Three more full runs on
  the same build each had failures that are not 1.3's: 6 timing failures while the Mac's load average
  was 74–100 (all passed on rerun, 24/24); the hand-tapped tempo in the journey reading 75.5 BPM while
  the load was still high; and once `e2e/filming.spec.ts:14` logged "WebKitBlobResource error 3"
  reading a just-recorded clip. That last one is older than 1.3: the same check on 1.2.1's code failed
  3 of 20 repeats with the same error (1.3 1 of 12); the recording code is unchanged since 1.2.1.
- Only the iPad can confirm (1.3): her loop going round on the real YouTube player on the beat with the
  count-in (real seeks land on keyframes); the nudges by touch; the hint in the coach's voice; Test
  YouTube's answers on the iPad's own network and Screen Time settings (and "offline" with Wi-Fi off);
  the 20 s "didn't load" when YouTube really is blocked; Showtime's hidden stand-in never tripping that
  limit; a real "won't play inside apps" error arriving within Test YouTube's 2 s wait.
- **Version 1.2.1 done and live (2026-11-26), build 6a9e548:** Rap basics (see "Version 1.2.1"
  below). Confirmed in WebKit against the live site at iPad portrait and landscape: "Version 1.2.1 ·
  build 6a9e548"; one precache cache of 224 files (215 clips); 8 lesson cards; on the path Rap basics
  sits after counting and the voice warm-up, just before her first rap lesson; its lesson plays the
  listen-and-read video (6DBtz2enWSA); a 1.1 save carries over as before; no console errors. The
  deploy workflow's unit checks passed (34 files, 304).
- **Version 1.2.0 done and live (2026-11-26), build 619be58.** Confirmed in WebKit against the live
  site at iPad portrait and landscape: the version line reads "Version 1.2.0 · build 619be58"; the
  service worker controls `/solostudio/` with one `solostudio:precache:<hash>` cache of 214 files (205
  of them the coach's clips) and a clip loads from it (200, audio/mp3); a 1.1 save carries over (save
  version 3, walk-on time 8 kept, the wizard counting all but her track as done, the 1.1 document
  kept as the backup copy); home shows Start, the D-day and the path; 7 lesson cards; only
  `solostudio:` keys; no console errors. The deploy workflow's unit checks passed (33 files, 301).
- 1.2.0 final checks: typecheck clean; unit 301/301 in 33 files; Playwright WebKit 132/132 (66 tests
  × iPad portrait and landscape), twice in a row on the same build (9.1 min each), no retries;
  REVIEW.md current; privacy scan clean (every file, every commit message, author and committer).
- Only the iPad can confirm (1.2): the coach's voice through the speaker (and after her first tap),
  its volume against the music, the count-in clips landing on the beat of her real track, the beat
  worked out from her real track, filming after "Get to your spot" and Film my Showtime with the real
  camera, the lesson videos playing inside the app, and narration offline (Airplane Mode after the
  first open). SETUP.md lists these with the 1.0 and 1.1 items.
- **Version 1.1.0 done and live (2026-11-26), build dafb6ff.** Confirmed in WebKit against the live
  site at iPad portrait and landscape: the service worker controls `/solostudio/` with one
  `solostudio:precache:<hash>` cache; a 1.0 save carries over (schema 2, sections and progress
  unchanged, the 1.0 document kept as the backup copy); only `solostudio:` keys; Today (D-day,
  Start today's practice, the tour card), her stage, Sounds, Showtime and Her week load; the version
  line reads "Version 1.1.0 · build dafb6ff"; no console errors. The deploy workflow's unit checks
  passed (25 files).
- 1.1 final checks: typecheck clean; unit 221/221 in 25 files; Playwright WebKit 100/100 (50 tests ×
  iPad portrait and landscape), twice in a row, no retries; REVIEW.md current; privacy scan clean.
- Only the iPad can confirm (1.1): the spoken cues in the iPad's English voice (and that speech
  works after her first tap), the count-in landing on the beat of her real track, sound levels
  (cues, stage-light sound, cheer, crowd, applause) from where she dances, and the camera recording
  after the count-in. SETUP.md lists these with the 1.0 items.

### 1.0

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

## Version 1.4 (in progress)

The owner's 1.4 brief: the singer's voice as a guide for the rap. Two parts, each checks first, then
code, a commit after each; a 1.3 save migrates through a tested migration (save version 5). No song
audio or lyrics ever go in the repo: the guide is loaded on the iPad and stays there, and the checks
make their audio on the spot (tones and clicks).

1. [x] Karaoke videos in the app. Checks first (841400f): `tests/unit/karaoke.test.ts`,
   `tests/unit/migration-v5.test.ts`, `e2e/karaoke.spec.ts`, `e2e/migration-v5.spec.ts` (fixture
   `tests/fixtures/v4-save.ts`). Two fixes to my own new checks, no assertion changed: placeholder lines
   from `lyricLine()` (d131552), and section-start taps at least a second apart (MIN_SECTION).
   Code: `DEFAULT_REFS` gains "Voice guide (light)" (81BPeeksFqo, role `voiceGuide`) and "Karaoke
   (no voice)" (d_-jC3519xI, role `karaoke`); save version 5 (migration 4 → 5 adds both after the
   videos already there, and an empty `guide`); `src/model/refs.ts` (add a YouTube video under a name,
   rename any, swap, remove an added or karaoke one); `videoName` in `src/model/room.ts` (every video
   by its name in the room); `rapMode`, `stepSource(step, section, save)`, `stepRoom`, `stepRoute` in
   `src/model/videos.ts`; `stepBefore` in `src/model/ladders.ts`; `stepCopyFor` in
   `src/content/ladders.ts`; the practice screen sends an unmarked karaoke rung to the room
   (`/room?section=…&step=…&source=…`), whose rung mode reads a two-line hint, ticks the rung and has
   Back a step; Grown-ups → Videos (add, rename, remove, Tap section starts → `/grownups/taps/:ref`,
   the wizard's tapper moved to `src/screens/grownups/tapper.ts`). Narration: 3 new clips (the room's
   rung hint and the rap lesson's new second line), 226 characters.
   - **Embedding:** YouTube's oEmbed answers 200 for 81BPeeksFqo and 401 ("Unauthorized") for
     d_-jC3519xI: its owner has turned off playing inside other apps. On the iPad the app shows its
     honest "won't play inside the app" panel with Open in YouTube. Put to the owner.
2. [x] A guide file in the app. Checks first (34a619f): `tests/unit/guide.test.ts`,
   `e2e/guide.spec.ts` (her track and the guide made on the spot: a 440 Hz tone with irregular
   clicks, a 660 Hz "voice", and a full mix 0.25 s late). Code: `src/model/guide.ts` (the voice
   levels and gains, which level each rap rung starts at, `guideReady`, `analyseGuide`: a whitened
   cross-correlation (phase transform, Hann windows, 60 Hz to 0.4 × an 8 kHz working rate after a
   triangular low-pass), then sample-exact at full rate; normalised correlation ≥ 0.3 means
   her music is in it, so a full mix; and `guideWav`, the four-channel 16-bit WAV),
   `src/media/guide-build.ts` (decode both on the iPad, work it out, build and store the file),
   `src/media/guided.ts` (one shared `<audio class="guide-audio">` through Web Audio: a channel
   splitter, a gain for her track and one for the guide, ramped 15 ms; if Web Audio can't take it,
   her track plays as before), `src/ui/voice-control.ts` (her control, or the one line for a
   grown-up), the control in practice, the room (on her track), recording and Showtime (Off and Light
   before she begins), Grown-ups → Her track → Guide file (load, work out, confirm or correct, hear it
   at each level, whose voice it is, remove, line it up again after a new track), the wizard's step 4
   pointing to the karaoke taps, and the debug hook's `voice()` and `hear()`. Save: `guide`, and media
   kinds `guide` and `mix`. One fix to my own new WebKit check, no assertion changed: its clicks
   flipped sign every sample and its full mix was 5512.5 samples late (so it had no clicks to line up
   by); now realistic clicks and a whole-sample lag. That check also led to a sturdier alignment (the
   band limit and the low-pass above).

3. [x] Every new screen looked at in both orientations (the room on a rung, Karaoke and memory rungs
   with Back a step, the rap lesson, Videos, Tap section starts, the wizard's step 4, Her track with
   the guide asking and ready, the voice control on every rap rung and on together/dance rungs, the
   room on her track, Showtime and recording before she begins, and the one line with no guide).
   Fixed: her track's art spilled its bars over the heading in portrait (WebKit sizes them before
   max-height; now clipped); the room in portrait put the voice control above the hint (now beside
   the speed controls); recording with her track pushed the voice choice and Record below the fold
   (the track art is a slim strip there, and the camera a little shorter in landscape).

Decisions (1.4):

- D33. The rap ladder keeps its five rungs (ids, lamps, ticks, spacing and history carry over) and
  fades the singer's voice: with no guide file, rap-listen plays the listen-and-read video, rap-say
  Voice guide, rap-fade Karaoke (the lines on screen still fade there), the two memory rungs her
  track. A karaoke video a grown-up removed gives that rung back its 1.3 source.
- D34. A karaoke rung opens in the practice room when its video has no start tapped on the section;
  "I did it" there ticks the rung like the practice screen. Back a step is on every rap rung after
  the first (practice screen and room); it only opens the rung before, so nothing is unticked or
  logged.
- D35. The room shows every video by its name: a grown-up's name for it, or for a default video they
  haven't renamed, the kind of video (as in 1.3). The seven earlier defaults can be renamed and
  swapped, not removed (the ladders use them); added videos and the two karaoke ones can be removed.
- D36. The control's label never names the singer in the repo (Decision 1): a grown-up types whose
  voice it is on the iPad, and the label reads "{name}'s voice" there.
- D37. Her track and the guide play from one media element, a four-channel WAV built on the iPad when
  a grown-up confirms the guide (her track in channels 1–2, the guide in 3–4, lined up by the offset
  the app worked out). One element means the voice can't drift from her track at any speed and the
  element keeps the pitch; Web Audio splits the channels and the control only moves two gains (with a
  15 ms ramp), so switching mid-loop never seeks. Spiked first in WebKit: at 50% and 75% the output's
  440 Hz stays at 440 Hz. Without a guide her track plays exactly as before (not through Web Audio).
- D38. Levels: the voice on its own plays over her full track (Light 0.35, about −9 dB; Full 1); a
  full mix crossfades with her track (Light: track 0.65 + mix 0.35; Full: the mix alone), so the music
  stays level. A rap rung with a guide starts at Full, Light, Off, Off, Off; everything else at Off;
  the room keeps her choice while it is open; Recording and Showtime start at Off with Light the only
  other choice, and the control goes once she begins.
- D39. A guide is used only when confirmed and built for the track on the iPad now (`guideReady`). A new
  or removed track deletes the four-channel file and asks a grown-up to line the guide up again.

## After 1.3.0: the flaky recording check (fixed, live 2026-11-27, build 18cb71e)

`e2e/filming.spec.ts:14` failed now and then with "WebKitBlobResource error 3" (1 in 12 runs on 1.3.0,
3 in 20 on 1.2.1). Two causes:

- **An app bug (fixed, bd28dba; checks first fd43486):** when Stop came a few milliseconds after
  recording started, WebKit's recorder handed back an empty clip, and the app kept it (pushing out one
  of her newest 3 clips) and tried to play it (the error is WebKit's range error on a 0-byte blob;
  forcing an instant Stop reproduced it 16/16). Now a recording runs for at least `MIN_RECORD_MS`
  (1 s; a Stop before then waits), and an empty clip is never kept: she sees "Nothing was recorded that
  time. Tap Record to try again." and Record is there again (`src/model/clips.ts`,
  `src/screens/kid/record.ts`; checks `tests/unit/short-recording.test.ts`,
  `e2e/short-recording.spec.ts`).
- **The test browser:** its recorder sometimes hands back nothing at all with the stand-in camera,
  whatever the app does (3 of 40 runs after the fix; other stand-in cameras, drawn every frame or with
  `requestFrame`, did no better). **Check change approved by the owner, committed on its own
  (7f5690f):** `e2e/helpers.ts` keeps WebKit's real recording whenever it has data, and otherwise hands
  the app a one-second test clip (`tests/fixtures/test-clip.ts`, WebKit's own recording of the stand-in
  camera's colour blocks, base64 MP4). No assertion changed.
- My own new `e2e/short-recording.spec.ts` first asserted an instant Stop always gives a non-empty clip;
  it now asserts what the app guarantees (the recorder runs at least `MIN_RECORD_MS`; a clip is kept
  only with something in it) (833c58c).
- Results: the once-flaky check 40/40 repeats at both orientations; the recording specs 36/36 (twice
  each); typecheck clean; unit 349/349 in 39 files; privacy scan clean; Playwright WebKit 172/172 (86
  tests × iPad portrait and landscape) twice in a row on the same build (9.5 min each), no retries.
  (A run before that was cut short when the Mac paused; its three failures each took about 10 minutes
  against a 90 s limit.)
- Pushed and deployed (the workflow's unit checks: 39 files, 349). Confirmed in WebKit against the live
  site at iPad portrait and landscape: "Version 1.3.0 · build 18cb71e"; one precache cache of 227 files
  (218 clips); the practice room, a part on her path, Test YouTube and a 1.2 save as before; a quick
  Stop records for a moment and keeps one clip with something in it.
- Only the iPad can confirm: that a real recording is never empty (the note should never appear in
  normal use) and that a quick Stop simply records for a second.

## Version 1.3 (done)

The owner's 1.3 brief: practice that needs no setup. Three parts, each checks first, then code, a
commit after each; a 1.2 save migrates through a tested migration (save version 4).

**Check changes approved by the owner (1.3), committed on their own (d18793b):** the save's version
is 4 (was 3) in `tests/unit/migration.test.ts`, `tests/unit/migration-v3.test.ts`,
`e2e/migration.spec.ts`, `e2e/migration-v3.spec.ts`; `tests/unit/path.test.ts`: with no sections and
no parts, today is a warm-up, one dance block (it opens the practice room) and a cool-down (was:
nothing to practise); `e2e/videos.spec.ts`: her loop buttons are "Loop start" / "Loop end" (were
"Loop from here" / "Loop to here"), one set everywhere. No other assertion changed.

1. [x] The practice room and save version 4. Checks first (2013507): `tests/unit/migration-v4.test.ts`,
   `tests/unit/room.test.ts`, `e2e/room.spec.ts`, `e2e/migration-v4.spec.ts` (fixture
   `tests/fixtures/v3-save.ts`, `tests/fixtures/grownup-words.ts`). Code: `src/model/room.ts`,
   `src/screens/kid/room.ts` (`/room`), `src/ui/loop.ts` (Loop start / Loop end with nudges, one set
   everywhere), save version 4 (`parts`, migration step 3 → 4), the welcome's Practice room button,
   home's Practice room button beside Start today's practice, `/room` open before setup and busy (no
   update mid-practice, screen awake). The welcome no longer says a grown-up sets things up first;
   home's "a grown-up needs to set the show date / add the parts first" lines are gone.
2. [x] Her parts feed the path. Checks first (9b17802): `tests/unit/parts-path.test.ts`,
   `e2e/parts-path.spec.ts`; my own new unit check then copied its fixture per test (it shared one
   array between tests; no assertion changed). Code: `PathItem` kind `part` and `followAlongParts` in
   `src/model/path.ts`; `src/model/today.ts` (free day from her parts, or one practice-room dance
   block; with dates and no sections each dance/together block takes an open part in turn);
   `SessionItem` kind `room` (`roomItems`, cue "Next: {part}, Dance, 50% speed", route `/room?…`);
   the room joins the session (cue, auto-play of her part, Next, I did it moves on) and reads the hint
   with `?hint=1`; `stepSource` in `src/model/videos.ts` (rap steps on a part with no lines: the
   listen-and-read video where words would light up, her track for the rest, with her loop buttons);
   the rap lesson's card says the words are in the video. All her screens are open before setup;
   `/` opens the welcome until setup is done or she has a part; the welcome has Let's go.
   Narration: 3 new clips (the hint), 214 characters.
3. [x] Honest video messages, and Test YouTube in the grown-ups' area. Checks first (c573f65):
   `tests/unit/video-messages.test.ts`, `e2e/video-messages.spec.ts`. Code:
   `src/model/video-problems.ts` (what each case shows; Test YouTube's words), `loadFailure` in
   `src/media/youtube-util.ts`, `src/media/youtube.ts` (offline vs not loaded, a 20 s limit for the
   player to get ready, `retry()`), `src/ui/video.ts` (the panel with Try again; offline comes back by
   itself on the `online` event), Test YouTube on the grown-ups' home.
4. [x] Narration: 3 new clips (the hint), 214 characters; all clips 218, 11,541 characters
   (ElevenLabs characters used in 1.3: 214). Every new screen looked at in both orientations (fixed:
   the room in portrait puts the player, her buttons and her loop before the videos, with a shorter
   video while the hint shows, so Loop start/end stay on screen; the narrator's buttons sit plainly in
   the hint card). SETUP.md and README for 1.3 (f06e843). Version 1.3.0 (7525869). Full checks and the
   live site: see Status. (The first full run was cut short when the Mac paused; its recording failures
   passed on rerun, 12/12.)

Decisions (1.3):

- D28. Save version 4 adds `parts` (her saved loops: id, name, source, from, to, the speeds ticked,
  createdAt). A newer version keeps an older copy of the app from writing over her parts.
- D29. The practice room lists every usable video, dance videos first (mirrored follow-along,
  tutorial with counts, tutorial, performance, original, listen-and-read, slow music, then any video
  from the iPad), and "My track" only once her track is loaded (no message when it isn't). It opens on
  the mirrored follow-along. Play with no loop simply plays; once she taps Loop end the loop goes
  round through RepLoop (a count-in at her tempo, the loop, a rest, again). Nudges move an end by
  0.2 s (never below 0, never under 1 s) and take effect next time round; nudging a picked part
  changes that part.
- D31. With no grown-up sections, her parts on the mirrored follow-along (role `mirrored`) are the
  dance lessons, sorted by where they start; counting and learning a dance come just before the
  first. Parts on other videos stay in the room. The free day: warm-up 5, a dance block (8 min) per
  open part in path order with water as the rules need, cool-down 5; with no parts, warm-up 5, one
  15-minute dance block in the room (the hint, read aloud), cool-down 5. A rap block with no sections
  opens the room on the listen-and-read video. Once a grown-up adds sections, nothing about the path
  or the plan changes from 1.2; her parts stay in the room.
- D32. "Videos need the internet" only when `navigator.onLine` is false. Online, a failed YouTube
  script or a player not ready within 20 s (a player kept hidden, like Showtime's stand-in, gets its
  time once it is on screen) says "The video didn’t load." with Try again, Open in YouTube and "If it
  keeps happening, ask a grown-up to check YouTube isn’t blocked on this iPad." Errors 150/101/100 are
  as before; other YouTube errors also offer Try again. Test YouTube (grown-ups' home) tests the
  mirrored follow-along: offline, blocked (online, didn't load), works (ready, and no error within
  2 s), or "this video won't play inside apps".
- D30. A part is ticked at 50, 75 and 100% speed: "I did it" ticks the highest of those at or below
  the speed it plays at, then moves to the next speed. Picking a part opens it at its next speed.
  Rename and Delete (with "Yes, delete it") are on every part.

## Version 1.2.1 (done)

The owner's follow-up: one more skill lesson, **Rap basics**, just before her first Rap lesson, with
the listen-and-read video (6DBtz2enWSA): riding the beat, crisp consonants, where to breathe, energy,
and learning the Korean lines slowly, sound by sound, one line at a time. (No "how the app works"
lesson: the first-run tour covers it.)

- [x] Check changes approved by the owner, committed on their own (e555853): the lesson list in
  `tests/unit/copy.test.ts` (eight, Rap basics after the voice warm-up), the lesson-card count in
  `e2e/offline.spec.ts` (8), and `tests/unit/path.test.ts` (Rap basics in the path order before her
  first rap lesson, and in what a rap lesson needs).
- [x] New check `tests/unit/rap-basics.test.ts` (d6db085); the lesson (94d33a9) in `src/content/lessons.ts`,
  `SKILL_LESSON_IDS` and `SKILL_NEEDS.rap`; no save version change (the save keeps only known lesson
  ids, and a 1.2 save simply has it still to do).
- [x] Narration: 10 new clips (the title, seven paragraphs, the try-it and "Next: Rap basics"),
  1,116 characters; read aloud in about 1 min 17 s. All clips: 215, 11,327 characters, 3.7 MB.
  ElevenLabs characters used in all of 1.2 and 1.2.1: 11,729.
- [x] Full checks: typecheck clean; unit 304/304 in 34 files; Playwright WebKit 132/132 twice in a
  row on the same build (9.1 and 9.2 min), no retries; REVIEW.md current; privacy scan clean.
- [x] Version 1.2.1 (1b71730), pushed, deployed, live site checked (see Status).

## Version 1.2 (done)

The owner's 1.2 brief: she finds it easy and a grown-up finds setup quick. Five parts, each checks
first, then code, a commit after each; a 1.1 save migrates through a tested migration.

0. [x] Save version 3 (`src/storage/migrate.ts` step 2 → 3; checks `tests/unit/migration-v3.test.ts`,
   `e2e/migration-v3.spec.ts`, fixture `tests/fixtures/v2-save.ts`): narration on, no skill lesson
   finished, the wizard counting what 1.1 had as done; everything else unchanged (her walk-on time
   included); the 1.1 document kept as the backup copy.
1. [x] Narration with ElevenLabs. The key is read from `ELEVENLABS_API_KEY` only (the owner's
   `~/.zshenv`; commands that need it run through `zsh -c`), never printed or written. The key is
   scoped: voices and speech, not account usage or models.
   - Privacy scan: key-shaped text and the key's exact value (`tests/unit/privacy-scan.test.ts`).
   - Voice: Jessica (cgSgspJ2msm6clMCkdW9), chosen from three samples (Jessica, Alice, Chris) in
     `.private/voice-samples/`; eleven_multilingual_v2, mp3_22050_32 (mono), stability 0.5,
     similarity 0.75, style 0.2, speaker boost.
   - `npm run voice` (`scripts/voice.mjs`, `scripts/voice-lib.mjs`): records every line in
     `src/content/narration.ts` into `public/voice/<hash>.mp3` (precached), listed in
     `src/content/voice-manifest.json`; the file name is a hash of words, context, voice, model,
     format and settings, so only changed lines are recorded; reports characters. The build runs
     `--check` (no key, no network). 205 clips, 10,211 characters, 3.4 MB.
   - Playback (`src/audio/narration.ts`, `speech-plan.ts`, `voice.ts`): Web Audio, labelled for the
     WebKit recorder; only a custom section name falls back to the iPad's voice.
   - The lessons are the brief's seven skill lessons, rewritten for listening; the coach reads them
     line by line (`src/ui/narrator.ts`) with Pause, Replay, Skip; Grown-ups → Lessons and narration
     turns reading off and swaps any lesson's video.
   - Checks: `tests/unit/narration.test.ts`, `e2e/narration.spec.ts`.
2. [x] Lessons become the home page (`src/model/path.ts`, `src/model/today.ts`, `src/ui/path.ts`,
   `src/screens/kid/today.ts`, `src/screens/kid/learn.ts`, `src/content/learn.ts`; checks
   `tests/unit/path.test.ts`, `e2e/home.spec.ts`).
3. [x] Filming with time to get ready (`getReadySchedule` in `src/model/countin.ts`, `runGetReady`,
   `src/media/clip-store.ts`, record and Showtime screens; checks `tests/unit/filming.test.ts`,
   `e2e/filming.spec.ts`).
4. [x] Setup as a pausable wizard (`src/screens/grownups/setup.ts`, `src/model/setup.ts`,
   `src/model/beat.ts` + `src/media/beat-run.ts`; checks `tests/unit/wizard.test.ts`,
   `tests/unit/beat.test.ts`, `e2e/wizard.spec.ts`). SETUP.md rewritten.
5. [x] No step blocked by video marks (`src/model/videos.ts`, `src/ui/loop.ts`,
   `src/ui/video-controls.ts`; checks `tests/unit/videos.test.ts`, `e2e/videos.spec.ts`).
6. [x] Full checks, every new screen in both orientations, 1.2.0, push, deploy, live check.
   - Every new screen looked at in both orientations (home and path, a skill lesson, a section
     lesson and its setup gap, an unmarked tutorial, Showtime's start, recording, every wizard step,
     Lessons and narration). Fixed: a tutorial step in landscape now puts the video left and her
     buttons right (Play and I did it were below the fold); her loop row sat above the video in
     portrait; the lesson video's speed buttons wrapped; the lit line had no room; the section
     lesson's step buttons were long; the starts step said "Load her track first" beside "Done".
   - Version 1.2.0 (dff0f9b).

**Check changes approved by the owner (1.2), committed on their own:** save version 3 and a 5 s
walk-on default (6a16905); cues recorded from clips in `e2e/voice.ts`, the seven skill lessons in
`copy.test.ts`/`layout.spec.ts`, and the seeded save having heard the skill lessons (42da448).

**Check fixes approved by the owner (1.2), committed on their own (11ca6af):**
- `tests/unit/narration.test.ts` (new): the MP3 check reads the Info frame at the start of each file
  (its bitrate field says 56 kbps); it should skip an Info/Xing frame and read the first audio frame
  (all clips are 32 kbps mono, confirmed with afinfo and by reading every frame).
- `tests/unit/lyrics.test.ts` (1.0): bans any `fetch(` in the app; loading the app's own precached
  clips needs one. Proposed: allow it in `src/audio/narration.ts` only, for URLs under the app's own
  `voice/` folder.
- `e2e/offline.spec.ts:103` (1.0): expects 6 lesson cards; there are now 7 (LESSON_IDS.length).
- `scripts/privacy-scan.mjs`: reads MP3s as text and six random audio bytes fit the email
  pattern; proposed: skip .mp3 like the images and fonts it already skips.
- `tests/unit/session.test.ts` (1.1): its own `save()` builds a save with no skill lesson heard, so
  two checks meet skill lessons in the session; proposed: mark them heard there too, as approved
  for `setUpSave()`.
- `tests/unit/path.test.ts` (new): its line text isn't a repo placeholder; use `lyricLine()`.
- `e2e/home.spec.ts` (new): asserts the path's exact order on the page and a single "Finished" fold,
  which can't both hold when finished lessons aren't all at the start; proposed: check the open
  lessons and the folded ones each in path order.
- `e2e/videos.spec.ts` (new): reads the fake player's `seeks`, which the `FakePlayer` type doesn't
  declare (a typecheck error); proposed: read it through `page.evaluate` as `session.spec.ts` does.

Decisions (1.2):

- D20. Narration is Web Audio, not media elements: iPadOS ignores a media element's volume, and a
  count word must start on its beat. One clip per full cue (every standard section name × every
  rung's ladder and speed), so the WebKit checks see the same words as before; a custom section name
  is the coach's "Next", the iPad's voice for the name, then the coach's "Rap, 75% speed".
- D21. Lesson reading is a grown-up switch (on by default) and uses her cue volume; her Sounds mute
  turns cues off, not lesson reading. Reading pauses itself when a video starts.
- D22. The path: each section's Rap then Dance in song order, then each Together, then Showtime;
  counting and the voice warm-up before the first rap lesson, learning a dance before the first dance
  lesson, marking and breathing before the first together lesson, expressions and performing before
  Showtime. In the session a skill lesson she hasn't done comes once, as a part of its own, just
  before the first practice that needs it. The session goes straight to practice; a section lesson's
  intro is on its own screen (from the path or today's lessons).
- D23. With no dates, today is a free day from the path: warm-up 5, about 8 minutes per lesson, water
  where the voice or water rule needs it, cool-down 5 (about 44 minutes).
- D24. One walk-on time (Showtime's walk and the countdown before filming), 5 s for a new save; a 1.1
  save keeps its value. Film my Showtime starts the camera at Start, films from her track to the end
  of the bow and keeps the clip with her run-throughs.
- D25. The wizard's required steps are worked out from what's there (track, lines, starts); the
  optional ones count only when a grown-up did them. The lines box: `[Name]` headers, `= meaning`
  under a line (marking it Korean said by sound); saving keeps sections with the same name (ids,
  marks, progress, breaths, timing). The beat guess is stored as the tempo until a grown-up checks it.
- D27. The coach says "Again" when she taps Again (the session's cue still comes first, once).
- D26. A practice video: one marked on the section wins and is cued to it; otherwise the step's video
  from a chapter time or its start (the tutorial with counts for Chorus and Dance break, the full one
  otherwise). Her loop on a practice screen counts in each time round, like every rep; on a lesson
  video it simply loops. The drill only offers "Show the video" when the follow-along is marked.

## Version 1.1 (done)

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
7. [x] Fun: stage lights, light stick, D-day, build the line, celebrations, her stage's name and
   colours (`src/model/stage.ts`, `celebrate.ts`, `buildline.ts`, `src/app/celebrate.ts`,
   `src/screens/kid/mystage.ts`, `src/ui/theme.ts`; checks `tests/unit/fun.test.ts`,
   `e2e/fun.spec.ts`).
8. [x] Count-ins before recording a section and counts from memory (`e2e/countin-everywhere.spec.ts`);
   SETUP.md (step 8: Showtime routine, Notes, Sounds; what to check on the iPad) and README;
   every new screen looked at in both orientations (fixed: Sounds' volume row wrapping in
   landscape, a blank Showtime stage before her first line, and Stop below the fold when a video
   stands in for her track); version 1.1.0; full checks; pushed and deployed.

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

- D15. Her stage is the Sections screen: each section a rig of 14 lamps (5 rap, 5 dance, 4
  together), lit for ticked steps, all lit on show day. Ticking a step plays the switch-on sound and
  shows "A light switched on" in the next screen's top bar (never over a player); finishing a ladder
  adds a cheer. Confetti (a pop and falling paper, `pointer-events: none`) only for her first full
  Showtime or family performance; a 1.0 save that already had one counts it as done.
- D16. Build the line takes a chip only when its word is next (the same word on two chips is the
  same); any other chip wiggles and stays. Nothing about misses is stored. Peek lights the next chip.
- D17. Colour themes (Neon, Sunset, Ocean, Mint) only change the colour variables; the light stick
  (Pink, Violet, Cyan, Lime, Gold) sits inside the 8-count box and pulses on each count.
- D19. Showtime's stage says "Showtime!" softly until her first line lights (and all through
  with the words off). With a video standing in for her track, the stage shrinks and the video is
  capped at 42vh so Stop stays in reach.
- D18. RangePlayer stops once per play, and also when the media stops or its clock freezes within
  0.5 s of the end (WebKit sometimes never fires "ended" there).

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

1.1 adds (all new files; 1.0's checks are unchanged except the approved journey waits):
unit `migration`, `drills`, `routes-v11`, `showtime-routine`, `week`, `listening`, `session`, `fun`;
WebKit `migration`, `drills`, `showtime-routine`, `grownups-week`, `listening`, `session`, `reach`
(main buttons on screen without scrolling and ≥ 88 px), `fun`, `countin-everywhere`, with a speech
stand-in in `e2e/voice.ts` that records each cue and whether any media was playing when it was said.

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
