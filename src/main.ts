/**
 * Boot: styles → store → service worker → router → debug hook → (once set up) ask the browser to
 * keep storage. Saves are written when the app is hidden or closed.
 */
import './styles/base.css'
import './styles/screens.css'
import { Router, type Screen } from './app/router'
import { registerServiceWorker } from './app/sw-register'
import { installDebugHook } from './app/debug'
import { KEYS } from './storage/keys'
import { MemoryStorage, initStore, type StorageLike } from './storage/store'
import { welcomeScreen } from './screens/kid/welcome'
import { todayScreen } from './screens/kid/today'
import { blockScreen } from './screens/kid/block'
import { practiceScreen } from './screens/kid/practice'
import { sectionScreen, sectionsScreen } from './screens/kid/sections'
import { quizScreen } from './screens/kid/quiz'
import { showtimeScreen } from './screens/kid/showtime'
import { drillScreen } from './screens/kid/drill'
import { unlockEffects } from './audio/sfx'
import { preloadCues, unlockSpeech } from './audio/voice'
import { startActivityLog } from './app/activity'
import { weekScreen } from './screens/grownups/week'
import { notesScreen } from './screens/grownups/notes'
import { soundsScreen } from './screens/kid/sounds'
import { tourScreen } from './screens/kid/tour'
import { myStageScreen } from './screens/kid/mystage'
import { applyTheme } from './ui/theme'
import { recordScreen } from './screens/kid/record'
import { clipsScreen } from './screens/kid/clips'
import { lessonScreen, lessonsScreen } from './screens/kid/lessons'
import { grownupsHome } from './screens/grownups/home'
import { askPersistenceOnce, planScreen } from './screens/grownups/plan'
import { trackScreen } from './screens/grownups/track'
import { refsScreen } from './screens/grownups/refs'
import { sectionEditor, sectionsAdmin } from './screens/grownups/sections'
import { tempoScreen } from './screens/grownups/tempo'
import { backupScreen } from './screens/grownups/backup'
import { linksScreen } from './screens/grownups/links'
import { showtimeSettingsScreen } from './screens/grownups/showtime'
import { lessonsAdmin } from './screens/grownups/lessons'
import { KID_COPY } from './content/kid'

function pickStorage(): StorageLike {
  try {
    if (window.localStorage) return window.localStorage
  } catch (err) {
    console.warn('[solostudio] localStorage unavailable; nothing will be kept', err)
  }
  return new MemoryStorage()
}

const store = initStore(pickStorage())
applyTheme(store.data.stage.theme)

window.addEventListener('pagehide', () => store.flush())
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') store.flush()
})
// Another tab of the app saved: take its copy so this one never writes stale data over it.
window.addEventListener('storage', (e) => {
  if (e.key === KEYS.save && e.newValue) store.reloadFromStorage()
})

registerServiceWorker()

// iPadOS lets a page speak and play sounds only after a tap: her first tap wakes both (silently).
const unlock = () => {
  unlockSpeech()
  unlockEffects()
  preloadCues(KID_COPY.cues.getToSpot, KID_COPY.cues.again)
  document.removeEventListener('pointerdown', unlock, true)
}
document.addEventListener('pointerdown', unlock, true)
startActivityLog()

const routes: [string, Screen][] = [
  ['/welcome', welcomeScreen],
  ['/today', todayScreen],
  ['/block/:id', blockScreen],
  ['/practice/:section/:step', practiceScreen],
  ['/sections', sectionsScreen],
  ['/section/:id', sectionScreen],
  ['/quiz/:id/:kind', quizScreen],
  ['/showtime', showtimeScreen],
  ['/drill/:kind', drillScreen],
  ['/record/:target', recordScreen],
  ['/clips', clipsScreen],
  ['/sounds', soundsScreen],
  ['/tour', tourScreen],
  ['/my-stage', myStageScreen],
  ['/lessons', lessonsScreen],
  ['/lesson/:id', lessonScreen],
  ['/grownups', grownupsHome],
  ['/grownups/plan', planScreen],
  ['/grownups/track', trackScreen],
  ['/grownups/refs', refsScreen],
  ['/grownups/sections', sectionsAdmin],
  ['/grownups/section/:id', sectionEditor],
  ['/grownups/tempo', tempoScreen],
  ['/grownups/backup', backupScreen],
  ['/grownups/links', linksScreen],
  ['/grownups/showtime', showtimeSettingsScreen],
  ['/grownups/week', weekScreen],
  ['/grownups/notes', notesScreen],
  ['/grownups/lessons', lessonsAdmin],
]

const app = document.getElementById('app')
if (app) new Router(app, routes).start()

installDebugHook()

if (store.data.setup.complete) void askPersistenceOnce()
