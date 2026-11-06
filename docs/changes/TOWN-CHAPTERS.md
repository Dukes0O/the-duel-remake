# TOWN-CHAPTERS

## Changed

- Added a data driven, open ended Act 1 chapter graph. It reads town facts and
  has no saved chapter counter or finished state. A new story can supply its
  own chapter list and conditions.
- Added the 64 captions from story section 10 as town line data, registered
  with the story radio. Founder names and the years aground line can be filled
  from town data.
- Added chapter, NEXT sentence, and line checks. Urgent town text takes
  priority; otherwise NEXT describes the active chapter or work in progress.
- Design choice is recorded on the card under “Codex decided (Claude to review)”.

## Checks

- `node tools/test-town-chapters.mjs` — passed (10 Act 1 chapters, 64 captions).
- `npm run build` — passed. Vite reported dynamic import and
  large chunk warnings; it completed successfully.
- Browser and look checks — not run here; Claude should check the town story
  radio, the chapter NEXT line, and each chapter's map target in the browser.
- Changed assertions — none.
- Race fingerprints and world signatures — unchanged; this work does not touch
  race simulation or course data.

## Removed

- Nothing. No existing behavior or files were replaced.
