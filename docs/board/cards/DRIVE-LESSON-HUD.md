# DRIVE-LESSON-HUD

The short board entry controls current state, ownership, dependencies and locks.

Claude, 24 October, from the drive-lesson-run browser pictures at merge.

- During a lesson the race screen must not show Time Trial chrome that does not
  apply: hide the "TT / Record your ghost" banner, the lap count and the style
  points. Keep speed, gear, the minimap and the lesson panel.
- The instructor's caption box sits over the minimap; move it so the two never
  overlap (for example under the lesson panel).
- Switch-off and every non-lesson race screen unchanged. The browser scenario
  `drive-lesson-run` gains a check that the banner is hidden and the caption
  and minimap boxes do not overlap; the laptop runs it.
