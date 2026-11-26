/**
 * Spoken cues: "Next: Chorus", the "5, 6, 7, 8" count-in, the Showtime routine. Since version 1.2
 * they are said in the coach's recorded voice (src/audio/narration.ts); only what has no clip (a
 * custom section name) is said in the iPad's own English voice. Rules:
 *  - only between reps: nothing is said while her track, a video or a YouTube player is playing;
 *  - their own volume and mute (Today → Sounds), separate from the sound effects;
 *  - every word comes from src/content (the caller passes it in).
 * iPadOS only lets a page speak after a tap, so unlockSpeech() says nothing at all inside her first tap.
 */
import { save } from '../app/ctx'
import { mediaPlaying } from '../media/now-playing'
import { COUNT_IN_WORDS } from '../model/countin'
import { playClip, preloadClips, type ClipPlayback } from './narration'
import { clipFor, speechMs, speechPlan, type SpeechPart } from './speech-plan'

let voice: SpeechSynthesisVoice | null | undefined

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
}

/** The iPad's English voice: its own language's English voice if it has one, else any English voice. */
function englishVoice(s: SpeechSynthesis): SpeechSynthesisVoice | null {
  if (voice !== undefined) return voice
  const all = s.getVoices()
  if (!all.length) return null
  const norm = (lang: string) => lang.toLowerCase().replace('_', '-')
  const en = all.filter((v) => /^en(-|$)/.test(norm(v.lang)))
  const want = norm(navigator.language || 'en-GB')
  voice = (/^en/.test(want) ? en.find((v) => norm(v.lang) === want && v.localService) ?? en.find((v) => norm(v.lang) === want) : undefined) ?? en.find((v) => v.default) ?? en.find((v) => v.localService) ?? en[0] ?? null
  return voice
}

if (typeof window !== 'undefined' && synth()) synth()!.addEventListener?.('voiceschanged', () => (voice = undefined))

/** The iPad's own voice, right now. */
function speak(text: string, volume: number): boolean {
  const s = synth()
  if (!s) return false
  try {
    s.cancel()
    const u = new SpeechSynthesisUtterance(text)
    const v = englishVoice(s)
    if (v) u.voice = v
    u.lang = v?.lang ?? (/^en/i.test(navigator.language) ? navigator.language : 'en-GB')
    u.volume = volume
    u.rate = 1
    s.speak(u)
    return true
  } catch (err) {
    console.warn('[solostudio] speech failed', err)
    return false
  }
}

/** Bumped by hush(): a cue still on its way stops at its next part. */
let turn = 0
let clip: ClipPlayback | null = null

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

async function run(parts: SpeechPart[], mine: number, volume: number): Promise<void> {
  for (const part of parts) {
    if (mine !== turn || mediaPlaying()) return
    if (part.kind === 'clip') {
      const p = await playClip(part.clip, part.text, volume)
      if (mine !== turn) {
        p?.stop()
        return
      }
      if (p) {
        clip = p
        await p.done
        if (clip === p) clip = null
        continue
      }
    }
    // No clip, or it couldn't play: the iPad's own voice, given time to finish.
    speak(part.text, volume)
    await wait(speechMs(part.text))
  }
}

/** Say it now, unless cues are off or anything is playing. Returns whether it is being said. */
export function say(text: string): boolean {
  const sound = save().sound
  if (!text.trim() || !sound.voiceOn || sound.voiceVolume <= 0) return false
  if (mediaPlaying()) return false
  const parts = speechPlan(text)
  if (!parts.length) return false
  hush()
  void run(parts, turn, sound.voiceVolume)
  return true
}

/** Stop anything being said (before the music comes in). */
export function hush(): void {
  turn++
  clip?.stop()
  clip = null
  try {
    synth()?.cancel()
  } catch {
    /* nothing to stop */
  }
}

/** Decode the count-in and these cues now, so they start on time. */
export function preloadCues(...texts: string[]): void {
  preloadClips([...COUNT_IN_WORDS, ...texts].map((t) => clipFor(t)))
}

/** Inside her first tap: let speech (and sound effects) work later from timers. Says nothing. */
export function unlockSpeech(): void {
  const s = synth()
  if (!s || mediaPlaying()) return
  try {
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    s.speak(u)
  } catch {
    /* not available */
  }
}
