/**
 * Building the guide on the iPad (version 1.4): her track and the guide file are decoded, the app
 * works out whether the guide is a full mix or the voice on its own (and lines a full mix up with
 * her track), and once a grown-up confirms, writes both side by side into one four-channel WAV in
 * IndexedDB. Nothing leaves the iPad.
 */
import { audioContext } from '../audio/sfx'
import { decode } from '../audio/narration'
import { analyseGuide, guideWav, mono, type GuideAnalysis } from '../model/guide'
import { media, newMediaId } from '../storage/media'
import type { GuideKind } from '../storage/schema'

interface Decoded {
  rate: number
  channels: Float32Array[]
}

/** The last pair decoded, kept between working it out and building it (decoding takes a moment). */
let cached: { trackId: string; guideId: string; track: Decoded; guide: Decoded } | null = null

async function decodeMedia(id: string): Promise<Decoded> {
  const rec = await (await media()).get(id)
  if (!rec) throw new Error('media missing')
  const c = audioContext()
  if (!c) throw new Error('no Web Audio')
  const buf = await decode(c, await rec.blob.arrayBuffer())
  return { rate: buf.sampleRate, channels: Array.from({ length: Math.min(2, buf.numberOfChannels) }, (_, i) => buf.getChannelData(i)) }
}

async function pair(trackId: string, guideId: string): Promise<{ track: Decoded; guide: Decoded }> {
  if (cached && cached.trackId === trackId && cached.guideId === guideId) return cached
  cached = null
  const track = await decodeMedia(trackId)
  const guide = await decodeMedia(guideId)
  cached = { trackId, guideId, track, guide }
  return cached
}

/** Is the guide a full mix or the voice on its own, and how does it line up with her track? */
export async function workOutGuide(trackId: string, guideId: string): Promise<GuideAnalysis> {
  const { track, guide } = await pair(trackId, guideId)
  return analyseGuide(mono(track.channels), mono(guide.channels), track.rate)
}

/** Write her track and the guide into one four-channel file; returns its media id. */
export async function buildGuide(trackId: string, guideId: string, kind: GuideKind, offset: number): Promise<string> {
  const { track, guide } = await pair(trackId, guideId)
  const chunks = guideWav(track.channels, guide.channels, track.rate, kind === 'mix' ? offset : 0)
  const blob = new Blob(chunks, { type: 'audio/wav' })
  const id = newMediaId('mix')
  await (await media()).put({ id, kind: 'mix', name: 'her track with the guide.wav', type: 'audio/wav', size: blob.size, createdAt: Date.now(), group: '', blob })
  return id
}

/** Let go of the decoded audio (a grown-up is done with the guide). */
export function forgetDecoded(): void {
  cached = null
}
