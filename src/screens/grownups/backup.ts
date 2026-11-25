/** Backup: export everything except media to a file, and import it (on this or another iPad). */
import { save } from '../../app/ctx'
import type { Screen } from '../../app/router'
import { backupFileName, exportJson, parseImport } from '../../storage/backup'
import { store } from '../../storage/store'
import { button, filePick } from '../../ui/components'
import { h } from '../../ui/dom'
import { grownScreen, savedNote } from './common'

export const backupScreen: Screen = (root) => {
  const status = h('div', { class: 'form-status' })
  const exportBtn = button('Export backup', () => {
    const now = new Date()
    const blob = new Blob([exportJson(save(), now)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = h('a', { href: url, download: backupFileName(now), class: 'sr-only' })
    document.body.append(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }, { variant: 'primary' })

  const importStatus = h('div', { class: 'form-status stack' })
  const pick = filePick('Choose a backup file', 'import', 'application/json,.json', async (f) => {
    const result = parseImport(await f.text())
    if (!result.ok) return importStatus.replaceChildren(h('p', { class: 'import-error' }, result.error))
    const s = result.summary
    importStatus.replaceChildren(
      h('p', { class: 'import-summary' }, `${s.sections} sections, ${s.lines} lines, ${s.references} videos. Her track and local videos are not in the file: load them again after importing.`),
      h(
        'div',
        { class: 'row' },
        button('Replace everything with this backup', () => {
          store().writeBackup()
          store().replace(result.data)
          importStatus.replaceChildren(savedNote('Done. Everything except media is back.'))
        }, { variant: 'primary' }),
      ),
    )
  })

  grownScreen(
    root,
    'grownups-backup',
    'Backup',
    '/grownups',
    h(
      'section',
      { class: 'card stack' },
      h('h2', null, 'Export'),
      h('p', null, 'Saves the plan, sections, lines, marks, tempo, ticks and notes to a file (in Files). Her track, local videos and clips are not included: they stay on this iPad.'),
      h('div', { class: 'row' }, exportBtn),
      status,
    ),
    h('section', { class: 'card stack' }, h('h2', null, 'Import'), h('p', null, 'Replaces everything on this iPad with the backup. The current data is kept as a safety copy first.'), h('div', { class: 'row' }, pick), importStatus),
  )
}
