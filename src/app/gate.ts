/** The grown-ups' gate: a press-and-hold of about two seconds opens the grown-ups' area. */
import { KID_COPY } from '../content/kid'
import { holdButton } from '../ui/components'
import { go, unlockGrownups } from './ctx'

export const GATE_HOLD_MS = 2000

export function gateButton(): HTMLButtonElement {
  return holdButton(
    KID_COPY.welcome.gate,
    GATE_HOLD_MS,
    () => {
      unlockGrownups()
      go('/grownups')
    },
    'gate-hold',
  )
}
