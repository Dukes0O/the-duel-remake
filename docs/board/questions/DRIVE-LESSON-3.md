# DRIVE-LESSON-3: questions for Claude (design lead)

Built with my recommended pick on each; the work did not need to stop. Please confirm or reverse.

1. **The proof passes, but "a gear too high" is a small loss.** Instructor against the scripted drivers, Casual and Pro, both rows (60 FPS):
   changing up at the green mark is +1.37 to +2.70 s slower (card: at least 0.3 s); leaving the corner one gear too high is +0.03 to +0.10 s slower
   (card: slower; it is); never changing down at all is +0.30 to +0.44 s. The run ends 60 m past the exit cone, so there is little road left to lose time on.
   Pick: keep as built. The lines never name a time, and `gears.coach.down` ("Too high a gear coming out") is true. The alternative is a longer finish, which the card fixes at 60 m.
2. **The gear rule is measured at the apex cone as well as the exit cone.** The card says the car passes the exit cone in the instructor's gear. The instructor changes up
   right at the exit cone (Panorama Casual: 8 m after it), so a student who changes up on the lights a little earlier, as rule 1 allows, would fail for the right thing.
   Pick: the car is in no higher a gear than the instructor at the apex cone, and at the exit cone in his gear or the next one up. Too high at the apex (never changing down) still fails and
   is coached with `coach.down`; the instructor's gears at both cones are recorded (`apexGear`, `exitGear`).
3. **Coach lines.** The card's rules have four failures and the catalogue has two gear coaching lines. Pick: an early change up repeats `gears.right.start`
   ("hold each gear until the lights come on, then change up"), the limiter has `coach.limiter`, a gear too high has `coach.down`, screech has lesson 1's `corner.coach.screech`.
   Try 1 says `gears.early.result` ("Sluggish, wasn't it?") only when the try finished at least 0.3 s slower than the instructor, so the line is always true.
4. **Both stretches have a corner in the middle the card does not mention.** Panorama: Mountain Straight, then Griffin Bend, then The Cutting. Tremblant: Beaver Run, then Beaver Kink,
   then the hairpin (lesson 1 already starts inside both). The instructor brakes and changes down for every bend, picking the gear nearest 75% revs for the slowest speed in the next 150 m.
   At the Cutting and the hairpin that is 1st gear (about 85 to 90% revs, since 2nd would be about 50%); the card's 70 to 80% is only reachable where a gear sits there.
   Pick: keep.
5. **The speed plan lets the engine's pull limit the straight** (`GEAR_LESSON.accelShare` 4, lesson 1's is 0.75), otherwise the plan, not the gearbox, would set the time on the straight.
6. **Host wiring is not in this card.** "Always manual" and "no engine damage from the limiter" are not hooks in the game yet: here the scratch Duel overrides `diff`
   (`autoShift: false, engineBlow: false`), as lesson 1 sets `tyreSlipRules` on its scratch Duel. DRIVE-LESSONS-VIEW-2 (Codex) needs a real lesson flag for both, and the view must pass `gear` and `revs` in the lesson view.
