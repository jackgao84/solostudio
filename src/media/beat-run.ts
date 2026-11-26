/**
 * Working out the beat from her track (version 1.2): decode the file she loaded (it never leaves the
 * iPad), mix it to mono and let src/model/beat.ts find the tempo and the first "1".
 */
import { decode } from '../audio/narration'
import { audioContext } from '../audio/sfx'
import { detectBeat, type BeatGuess } from '../model/beat'

export async function detectFromBlob(blob: Blob): Promise<BeatGuess | null> {
  const c = audioContext()
  if (!c) return null
  try {
    const buf = await decode(c, await blob.arrayBuffer())
    const mono = new Float32Array(buf.length)
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < d.length; i++) mono[i] += d[i] / buf.numberOfChannels
    }
    return detectBeat(mono, buf.sampleRate)
  } catch (err) {
    console.warn('[solostudio] beat detection failed', err)
    return null
  }
}
