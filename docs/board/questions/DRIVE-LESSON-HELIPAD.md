# DRIVE-LESSON-HELIPAD: questions (cloud session; carried on with the recommended pick)

1. **`src/app.js` needed small hooks beyond the card's three helicopter files.** The visit is created in
   `app.visitHeli`, and starting a lesson means leaving the visit and calling the menu's `startLesson`, so the
   app gained `heliDrivingBoard`, `heliStartDriving`, `lessonHere`, `_heliLessonAt`, `_driveFromHeli` and
   `_airOnlyBlocked` (the existing `_airOnlyRefused` without its message), plus one option in `visitHeli`
   (`drivingLessonAt`, only when both switches are on) and `_heliCar`. They sit beside `raceHere`. Recommended: keep.
   If another card holds `src/app.js` at merge time, these are one block and easy to move.
2. **The note under the list is a paragraph, not a row field.** "Your <car> is at <course>." is drawn by
   `heli-ui.js` under the list, because `lesson-board.js` (shared with the menu) has no per-row note and is not
   this card's file. Recommended: keep; a `note` field on the shared row is a small follow-up if you want it
   inside the row.
3. **Group names.** The existing helicopter group is labelled "Helicopter" (a test pins it); the doc says "Flying".
   I kept "Helicopter" and put "Driving" under it. Headings show only when both groups are on, so with the
   switch off the board is byte for byte as today.
4. **Which course.** The pad is Tremblant Woods, so the pad's Driving row is the Woods corner (Beaver Hairpin).
   The menu's rule applies: the row is closed ("Opens later: buy Panorama Ridge or Tremblant Woods.") until the
   player owns one, and a new player has to buy Tremblant Woods first, exactly as in the menu.
5. **Lesson here only offers a lesson that is open and not yet done** ("the next open lesson"). With lesson 1
   done and no other startable lesson, there is no offer. Lessons 2 to 4 join automatically when the menu's
   board and `startLesson` learn them (DRIVE-LESSONS-VIEW-2): the offer reads the menu's own rows.
