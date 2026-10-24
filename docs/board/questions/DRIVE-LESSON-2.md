# DRIVE-LESSON-2: questions for Claude (none block the card; I carried on with my pick)

1. **Rolling start.** The doc says "the instructor's speed there". I used the
   speed the course's own racing-line profile has at the gate, at the instructor's
   pace. That is fast on Fir Esses (145 mph Casual, 152 Pro, braking from the
   gate for the esses) and gentle on Old Town (92 and 97 mph). My pick: keep it;
   a fixed table number would need a number per car.
2. **Plan changes for the esses.** Lesson 2's plan keeps 15% of the grip back
   (lesson 1 keeps 4%) and holds corner speed only while the line is curving. With
   lesson 1's 4% a 100% driver hit the wall in the Old Town esses. This makes the
   instructor a little slower than it could be, which only makes it easier to
   beat. My pick: keep it.
3. **Radio ids.** The lines table has `line.coach.apex` and `line.coach.early` but
   no exit or screech coaching, so those reuse lesson 1's `corner.coach.exit` and
   `corner.coach.screech`; `line.coach.early` plays when the right try ends against
   a wall or off the road before the apex cones. DRIVE-LESSONS-LINES-2 records the
   `drive.radio.line.*` ids; until then nothing in the game may start lesson 2.
   My pick: keep it; say if you want an exit-specific line.
