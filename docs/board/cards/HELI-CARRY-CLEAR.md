# HELI-CARRY-CLEAR

The short board entry controls current state, ownership, dependencies and locks.

Kyle, 26 October 2026, with a screenshot: helicopter lesson 4 (Carry and set
down) is guesswork. Every drop in the yellow circle says "Not quite", the
circle is drawn as an arc, and there is no obvious way to pass. The rule
(`src/heli/heli-lessons.js`): release the crate with H while it rests on the
ground within 10 m of the target's centre; releasing in the air is a drop.

Claude's design (live feature: `helicopter` is on):
1. Draw the target as a complete circle exactly the pass radius, with a small
   centre mark.
2. While the crate is hooked, a line under the lesson goal says where it is:
   "Crate: 14 m from the centre · 3 m up". When it is inside the circle and
   resting on the ground the circle turns green and the line says "On the
   mark. Press H to let go."
3. A retry says why, in plain words: "The crate was 13 m from the centre: set
   it down inside the circle", "Let go only once the crate sits on the
   ground", or "It dropped: lower it gently first".
4. The goal text gains the hint: "Lower until the crate touches, then H."
Keep the 10 m radius (the guidance is the fix). Tests: each retry reason;
the green state; a scripted pilot passing inside two tries. The heli
first-flight scenario and one picture of the green circle. Lane tier, build.
