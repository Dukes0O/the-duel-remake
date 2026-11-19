# LAB-PAGE

Brian's page and the formula panel, for every classroom lesson (Kyle, 19 November 2026).

## Decided (Claude, Director)

1. The formula panel starts closed in every lesson; F or "Show the physics" opens it. Built in the lane
   `lab-formula-closed`, where the sixteen Lab scenarios were being taught to open it first (they stopped
   partway on 9 November). Finish that.
2. The step being worked on is at the top of Brian's page, in full.
3. Below it, one fold, "Words so far", closed by default, holds every word the lesson has defined (the
   steps that define a word, with their definition). Clicking a word opens it.
4. Steps that only gave an instruction or ran a test leave the page once done. Questions and their
   answers leave too. The recap's key ideas stay where they are now.
5. Backspace (Previous step) still works and still shows that step in full at the top.
6. A watch or run step that animates shows "Watch again" with R, which restarts its animation; a lesson
   whose step cannot restart shows no button. Suspension's existing button does nothing today: fix it.
7. Pacing belongs to each lesson card; this card only gives the R key and button.

Files: `src/lab/classroom/classroom-ui.js`, `classroom-frame.js`, `classroom.css`, `tools/scenarios/lab-*.mjs`,
`tools/test-lab-classroom*.mjs`. Lock: `lab-classroom-frame`; lesson cards change lesson files only and
merge after this one where both touch a scenario.
