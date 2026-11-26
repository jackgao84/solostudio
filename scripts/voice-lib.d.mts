/** Types for scripts/voice-lib.mjs (used by the unit checks). */
export interface VoiceLine {
  text: string
  prev?: string
  next?: string
}
export interface VoiceClip {
  text: string
  file: string
  chars: number
  bytes: number
  ms: number
}
export interface VoiceSettings {
  stability: number
  similarity_boost: number
  style: number
  use_speaker_boost: boolean
}
export declare const VOICE: { readonly id: string; readonly name: string }
export declare const MODEL: string
export declare const FORMAT: string
export declare const SETTINGS: Readonly<VoiceSettings>
export declare function clipHash(line: VoiceLine, o?: { voice?: string; model?: string; format?: string; settings?: VoiceSettings }): string
export declare function planVoice(lines: VoiceLine[], manifest: { clips?: VoiceClip[] }, files: Set<string>): { keep: VoiceClip[]; make: VoiceLine[]; remove: string[] }
export declare function mp3DurationMs(buf: Uint8Array): number
