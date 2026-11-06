# TOWN-VANE

## Changed

- Added a registered pure town system for Mrs Vane. It starts after Year 7 and Chapter 16, offers brown streets for kiosks after two months and then every four months, closes kiosks when their street is clean, and delivers at most one queued letter in a month. Yearly letter rows can recur after a six-month quiet period.
- Added Act 3 chapter and caption data, including the Mr Crisp visit lines, and 35 Mrs Vane letters with the required greeting and sign-off.
- Exported the new town API and registered its system.

## Checks

- `node tools/test-town-vane.mjs`: passed. Five chapters, 72 registered captions, and 35 letters.
- `npm.cmd run build`: passed. Vite reported the existing dynamic import and large-chunk warnings.
- Lane tier: not run; Claude runs it.
- Browser scenario and look check: not run. Claude should check the Year 7 start, kiosk timing and closure, chapter access, letter cadence and Mr Crisp visits in the town view.
- Changed assertions: none.
- Race fingerprints: unchanged; this is town-only code and content.

## Removed

- Nothing. This adds town story behavior and content.
