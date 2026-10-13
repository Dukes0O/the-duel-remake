# P4-CAREER-MENU

Status: accepted dev source; lane, build and independent ordinary review passed. Settled menu slice only; parent Career keeps variants and their pending cost decision.

## Design before code

Keep the original course panel and ordinary actions exact when grand-prix-career is off. When enabled, use the supplied App.grandPrixAvailable callback to partition COURSE in its existing order into GRAND PRIX and CLASSIC COURSES, omitting empty groups. Each course appears once. Keep prices, ownership, affordability, accessible labels, messages, recommendations and the base-only Team Room button. Describe authored fieldSize and grandPrixLaps, defaulting to eight cars and three laps; open courses say ONE RUN.

An explicit data-course-mode="grandprix" button is selected only when both course and current mode match. Its action first checks the career switch, menu status, supported explicit mode and actual availability. The existing guarded App.selectCourse verifies current ownership; only success requests mode through App.setRaceSettings, refreshes choices and closes the panel. Ordinary select and purchase paths remain exact; purchase never selects a course or mode. Router edits are limited to panel options and action construction. No App, race, price, flag, membership, storage, pay, variant or dossier changes.

## Tests and review

Author the owned Node acceptance test before implementation. It compares the complete flag-off panel with the original markup, exercises real memory-only App mode selection and purchases, and covers grouping, actual labels, locked/off/unsupported/mid-race rejection and base-only Team Room controls. Original-source RED: all six cases failed on their missing feature assertions; the complete legacy panel comparisons already passed. Focused GREEN: six cases passed, none failed, in 48.55 ms of reported case time; all App storage was memory-only. All existing course-access assertions remain unchanged. Focused checks and the one canonical nearby gate/build wait for the Director's shared-capacity grant. Actual browser checks belong to night.

## Removed

Unpack the small panel into readable LF source. Replace its flat grid only for the enabled Career menu; retain the original markup and action behavior for the disabled switch. No runtime dependency, test harness, asset or save field is added.

## Integration acceptance

Frozen source 74fa442a450a63fbbc7ceea90ada16c4c49bf371 passed the original unfiltered nearby lane: 31/31, zero failures or unrun suites, exit 0, 441850.3045 ms. The same clean source built successfully: Vite 1.36 s, receipt 2465.8483 ms, exit 0. Root's independent ordinary review is clear. Merge was conflict-free; no rerun. All QA storage was memory-only. The disabled switch preserves the original complete markup and actions. Parent P4-CAREER still waits for Claude's future-variant cost decision and owns prospective podium tracking. Browser/full checks remain for night. No release or push.