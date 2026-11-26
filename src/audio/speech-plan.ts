/**
 * How a cue is said (version 1.2): as one of the coach's recorded clips when there is one for those
 * words (src/content/voice-manifest.json); a cue with a custom section name in it as the coach's
 * "Next", the name in the iPad's own voice, then the coach again; several sentences one by one;
 * anything else in the iPad's voice. Pure, so the checks can read it.
 */
import { KID_COPY } from '../content/kid'
import { clipKey, cuePrefix, stepCueTails } from '../content/narration'
import manifest from '../content/voice-manifest.json'

export interface ClipInfo {
  text: string
  file: string
  ms: number
}

export type SpeechPart = { kind: 'clip'; text: string; clip: ClipInfo } | { kind: 'speech'; text: string }

const BY_KEY = new Map((manifest.clips as ClipInfo[]).map((c) => [clipKey(c.text), c]))

/** The coach's clip for these words (a sentence's final full stop doesn't matter), or null. */
export function clipFor(text: string): ClipInfo | null {
  const k = clipKey(text)
  return BY_KEY.get(k) ?? BY_KEY.get(k.replace(/\.$/, '')) ?? null
}

const clipPart = (c: ClipInfo): SpeechPart => ({ kind: 'clip', text: c.text, clip: c })

export function speechPlan(text: string): SpeechPart[] {
  const t = text.trim()
  if (!t) return []
  const whole = clipFor(t)
  if (whole) return [{ kind: 'clip', text: t, clip: whole }]

  // "Next: {custom}" and "Next: {custom}, Rap, 75% speed": only the name in the iPad's voice.
  const lead = KID_COPY.cues.nextSection.split('{section}')[0]
  const prefix = clipFor(cuePrefix())
  if (prefix && t.startsWith(lead)) {
    const rest = t.slice(lead.length).trim()
    for (const tail of stepCueTails()) {
      const end = `, ${tail}`
      const tailClip = clipFor(tail)
      if (tailClip && rest.toLowerCase().endsWith(end.toLowerCase()) && rest.length > end.length) {
        return [clipPart(prefix), { kind: 'speech', text: rest.slice(0, rest.length - end.length).trim() }, clipPart(tailClip)]
      }
    }
    if (rest && !rest.includes(', ')) return [clipPart(prefix), { kind: 'speech', text: rest }]
  }

  // Several sentences (a drill's "Next: Start anywhere. Next: Chorus"): each on its own.
  const sentences = t.split(/(?<=[.!?])\s+/).filter(Boolean)
  if (sentences.length > 1) return sentences.flatMap(speechPlan)
  return [{ kind: 'speech', text: t }]
}

/** About how long the iPad's own voice takes to say something. */
export function speechMs(text: string): number {
  return Math.max(600, Math.round(text.length * 65))
}

/** About how long a cue takes to say: its clips' real lengths, plus the iPad's voice for the rest. */
export function sayMs(text: string): number {
  return speechPlan(text).reduce((a, p) => a + (p.kind === 'clip' ? p.clip.ms : speechMs(p.text)), 0)
}
