# LAB-BRIAN-SHORT

From the audit of 9 November 2026 (`docs/board/audit-2026-11-09.md`, item L2). Kyle said yes
to this card on 9 November.

In the classroom lessons Brian's words arrive as paragraphs of four and five sentences in a
narrow strip beside a small picture. A slower reader meets a wall of text.

## Settled design (Claude)

- **Three sentences at a time.** The newest thing Brian says is at most three sentences,
  about 45 words. Anything more waits behind a "Tell me more" button on that step.
- **Every step stays on the page.** Kyle asked on 4 November for one running page that keeps
  every step, and that stays true. An earlier step is drawn as its heading and first sentence;
  a click opens it in full. Only the current step is open by default.
- **All sixteen lessons**, with the wording rules in `docs/lab-lesson-authoring.md` and the
  memory note "Lessons teach in prose". Shortening is done by moving sentences behind "Tell me
  more", not by cutting what a lesson teaches: every defined word keeps its definition.
- **Pendulums first.** Change the frame and Pendulums, make one look sheet
  (`docs/board/looks/lab-classroom/`), then do the other fifteen.
- The three-sentence rule goes into `docs/lab-lesson-authoring.md` in the same commit.

## Files

`src/lab/classroom/` (the frame and its styles), `src/lab/lessons/*-classroom.js` (text only),
`docs/lab-lesson-authoring.md`, one new test. Lesson rules, challenges and saves do not change.

## Checks

- New test: in every classroom lesson, each step's opening text is at most three sentences,
  and each step that had more keeps the rest behind "Tell me more".
- Every `lab-*` browser scenario (memory note "Lab merges: all lab scenarios"); the lane tier
  alone misses some.
- Laptop only: Claude reads Pendulums start to finish in a visible browser, then one lesson
  from each other group.

## Result (Claude, 9 November 2026)

Done and merged; see `docs/changes/LAB-BRIAN-SHORT.md`. Claude read Pendulums by hand in a visible browser after the merge.
The key for "Tell me more" is T, because M switches the sound off.

## Removed

Nothing is deleted from the lessons. Any lesson text that says the same thing twice goes.
