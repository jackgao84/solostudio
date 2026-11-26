/**
 * The narration's recording settings and the voice script's cache, shared by scripts/voice.mjs and
 * the unit checks. Each clip's file is named by a hash of its words, the words around it, the voice,
 * the model, the format and the settings, so a clip is only reused while all of those are unchanged.
 * Nothing here touches the network or the key.
 */
import { createHash } from 'node:crypto'

/** The coach's voice, chosen by the owner from three samples (2026-11-26). */
export const VOICE = Object.freeze({ id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica' })
export const MODEL = 'eleven_multilingual_v2'
/** Small mono MP3s: 22.05 kHz at 32 kbps. */
export const FORMAT = 'mp3_22050_32'
export const SETTINGS = Object.freeze({ stability: 0.5, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true })

export function clipHash(line, o = {}) {
  const parts = [o.voice ?? VOICE.id, o.model ?? MODEL, o.format ?? FORMAT, o.settings ?? SETTINGS, line.text, line.prev ?? '', line.next ?? '']
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 16)
}

/** What to keep, what to record and which files to remove, given the lines, the manifest and the files on disk. */
export function planVoice(lines, manifest, files) {
  const byFile = new Map((manifest.clips ?? []).map((c) => [c.file, c]))
  const wanted = new Set(lines.map((l) => `${clipHash(l)}.mp3`))
  const keep = []
  const make = []
  for (const l of lines) {
    const file = `${clipHash(l)}.mp3`
    const c = byFile.get(file)
    if (c && c.text === l.text && files.has(file)) keep.push(c)
    else make.push(l)
  }
  const remove = [...new Set([...files, ...(manifest.clips ?? []).map((c) => c.file)])].filter((f) => !wanted.has(f))
  return { keep, make, remove }
}

const BITRATES = {
  // MPEG-1 layer III, MPEG-2/2.5 layer III (kbps)
  1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
}
const RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] }

/** An MP3's length in milliseconds, from its frames. */
export function mp3DurationMs(buf) {
  let i = 0
  if (buf.length > 10 && buf.toString('latin1', 0, 3) === 'ID3') i = 10 + ((buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9])
  let samples = 0
  let rate = 22050
  while (i < buf.length - 4) {
    if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) {
      i++
      continue
    }
    const version = (buf[i + 1] >> 3) & 3
    const layer = (buf[i + 1] >> 1) & 3
    const br = (buf[i + 2] >> 4) & 15
    const sr = (buf[i + 2] >> 2) & 3
    const pad = (buf[i + 2] >> 1) & 1
    if (version === 1 || layer !== 1 || br === 0 || br === 15 || sr === 3) {
      i++
      continue
    }
    rate = RATES[version][sr]
    const kbps = BITRATES[version === 3 ? 1 : 2][br]
    const perFrame = version === 3 ? 1152 : 576
    const len = Math.floor(((version === 3 ? 144 : 72) * kbps * 1000) / rate) + pad
    if (len < 4) break
    samples += perFrame
    i += len
  }
  return Math.round((samples / rate) * 1000)
}
