/**
 * Spoken cues in the iPad's English voice: "Next: Chorus", the "5, 6, 7, 8" count-in, the Showtime
 * routine. Rules:
 *  - only between reps: nothing is said while her track, a video or a YouTube player is playing;
 *  - their own volume and mute (Today → Sounds), separate from the sound effects;
 *  - every word comes from src/content (the caller passes it in).
 * iPadOS only lets a page speak after a tap, so unlockAudio() says nothing at all inside her first tap.
 */
import { save } from '../app/ctx'
import { mediaPlaying } from '../media/now-playing'

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

/** Say it now, unless cues are off or anything is playing. Returns whether it was said. */
export function say(text: string): boolean {
  const s = synth()
  const sound = save().sound
  if (!s || !text.trim() || !sound.voiceOn || sound.voiceVolume <= 0) return false
  if (mediaPlaying()) return false
  try {
    s.cancel()
    const u = new SpeechSynthesisUtterance(text)
    const v = englishVoice(s)
    if (v) u.voice = v
    u.lang = v?.lang ?? (/^en/i.test(navigator.language) ? navigator.language : 'en-GB')
    u.volume = sound.voiceVolume
    u.rate = 1
    s.speak(u)
    return true
  } catch (err) {
    console.warn('[solostudio] speech failed', err)
    return false
  }
}

/** Stop anything being said (before the music comes in). */
export function hush(): void {
  try {
    synth()?.cancel()
  } catch {
    /* nothing to stop */
  }
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
