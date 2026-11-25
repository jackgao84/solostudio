/**
 * Every storage key, cache name and database name this app uses. The web origin
 * (<user>.github.io) is shared with other family apps, so EVERYTHING starts with "solostudio:".
 * Never use a bare key anywhere else.
 */
export const PREFIX = 'solostudio:'

export const KEYS = {
  /** The whole save document (JSON, versioned). Everything except media. */
  save: `${PREFIX}save`,
  /** Last known-good copy, written before imports, resets and migrations. */
  backup: `${PREFIX}save:backup`,
} as const

/** IndexedDB database holding media (her track, local reference videos, her clips). */
export const MEDIA_DB = `${PREFIX}media`
/** Object stores inside MEDIA_DB: the bytes, and the small records listed without loading bytes. */
export const MEDIA_STORE = 'media'
export const META_STORE = 'meta'

/** Service worker caches are named `${CACHE_PREFIX}<build hash>` (see src/sw/sw-template.js). */
export const CACHE_PREFIX = `${PREFIX}precache:`

/** Message posted to a waiting service worker to switch on an update. */
export const SW_SKIP_WAITING = `${PREFIX}skip-waiting`

/** Every name above, for the prefix check. */
export const ALL_NAMES: readonly string[] = [KEYS.save, KEYS.backup, MEDIA_DB, CACHE_PREFIX, SW_SKIP_WAITING]
