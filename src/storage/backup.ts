/**
 * The backup file: everything except media (her track, videos and clips stay in IndexedDB on the
 * iPad). Import goes through the same normalising as loading and refuses files from newer versions.
 */
import { normalize, versionOf } from './normalize'
import { CURRENT_SCHEMA_VERSION, type SaveData } from './schema'

export const EXPORT_APP = 'solostudio'

export interface ImportSummary {
  sections: number
  lines: number
  references: number
  /** Media the backup refers to (not in the file): her track, then local videos. */
  media: string[]
}

export type ImportResult = { ok: true; data: SaveData; summary: ImportSummary } | { ok: false; error: string }

export const IMPORT_ERRORS = {
  empty: 'That file is empty. Try choosing the backup file again.',
  notOurs: 'That doesn’t look like a Solo Studio backup. Check it’s the right file and try again.',
  otherApp: 'That backup belongs to a different app, so it was left alone.',
  newer: 'That backup is from a newer version of Solo Studio. Update the app first (Grown-ups → Restart now), then try again.',
} as const

export function exportJson(data: SaveData, now: Date): string {
  return JSON.stringify({ app: EXPORT_APP, exportedAt: now.toISOString(), schemaVersion: data.schemaVersion, data }, null, 2)
}

export function backupFileName(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `solostudio-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`
}

export function mediaIdsIn(data: SaveData): string[] {
  const ids: string[] = []
  if (data.track.mediaId) ids.push(data.track.mediaId)
  for (const r of data.refs) if (r.kind === 'local' && r.mediaId) ids.push(r.mediaId)
  return ids
}

export function summarize(data: SaveData): ImportSummary {
  return {
    sections: data.sections.length,
    lines: data.sections.reduce((a, s) => a + s.lines.length, 0),
    references: data.refs.length,
    media: mediaIdsIn(data),
  }
}

export function parseImport(text: string): ImportResult {
  const trimmed = text.replace(/^﻿/, '').trim()
  if (!trimmed) return { ok: false, error: IMPORT_ERRORS.empty }
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return { ok: false, error: IMPORT_ERRORS.notOurs }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return { ok: false, error: IMPORT_ERRORS.notOurs }
  const env = parsed as Record<string, unknown>
  if (env.app !== EXPORT_APP) return { ok: false, error: 'app' in env ? IMPORT_ERRORS.otherApp : IMPORT_ERRORS.notOurs }
  const v = versionOf(env.data)
  if (v === null) return { ok: false, error: IMPORT_ERRORS.notOurs }
  if (v > CURRENT_SCHEMA_VERSION) return { ok: false, error: IMPORT_ERRORS.newer }
  const data = normalize(env.data)
  return { ok: true, data, summary: summarize(data) }
}
