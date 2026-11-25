/** Ask the browser to keep this app's storage (media included) rather than clear it when space runs low. */

interface NavigatorLike {
  storage?: { persist?: () => Promise<boolean> }
}

export async function requestPersistence(nav: NavigatorLike = navigator as unknown as NavigatorLike): Promise<boolean | null> {
  try {
    if (!nav.storage || typeof nav.storage.persist !== 'function') return null
    return await nav.storage.persist()
  } catch {
    return null
  }
}
