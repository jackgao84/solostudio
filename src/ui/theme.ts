/** Her stage's colour theme, applied to the whole app (colours only: never on or around a video). */
import type { StageTheme } from '../storage/schema'

export function applyTheme(theme: StageTheme): void {
  document.documentElement.setAttribute('data-theme', theme)
}
