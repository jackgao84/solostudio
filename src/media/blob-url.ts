/**
 * Blob URLs for media. A media element can still be reading from a URL for a moment after it is
 * told to stop, so URLs are released a little later, never while a read may be in flight.
 */
export function revokeLater(url: string | null): void {
  if (url) window.setTimeout(() => URL.revokeObjectURL(url), 3000)
}

/** Stop a media element and let go of its source. */
export function release(el: HTMLMediaElement, url: string | null): void {
  el.pause()
  el.removeAttribute('src')
  el.load()
  revokeLater(url)
}
