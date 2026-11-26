/**
 * Words that tell her a grown-up has to do something before she can carry on ("A grown-up sets
 * things up first", "Before you start, a grown-up must load your track"). Version 1.3 rejects any
 * screen that says this before she can watch and loop a video. Shared by the unit and WebKit checks.
 */
export const WAIT_FOR_GROWNUP = /grown-?ups?\b[^.]*\b(needs?|must|has to|have to|sets?|adds?|loads?|marks?)\b[^.]*\b(first|before)\b|\b(first|before)\b[^.]*\bgrown-?ups?\b/i
