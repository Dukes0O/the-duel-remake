# FIX-HELI-HOOK

The short board entry controls current state, ownership, dependencies and locks.

Claude, 24 October. Kyle cannot get the helicopter to hook cargo.

**Cause (read in the code):** `canHook` in `src/heli/heli-cable.js` needs the hook
within 3 m sideways, within 2 m of the load's height and a relative speed of at
most 1.5 m/s. The hook hangs 15 m below the helicopter, so the pilot must hold
13.7 to 17.7 m over the load's ground, nearly still. A failed H press does
nothing (`pressHook` returns null): no message, no sound. The drawn hook is a
0.18 m ball. A fitted bucket or rescue line also blocks H with no word.

**Settled design:**
- Wider window: reach 4 m, height slack 3.5 m, relative speed 2.5 m/s. Gear
  that changes reach keeps its relative difference.
- A failed H press says what to fix, one line on the flight panel for two
  seconds, in this order of priority: "Take the bucket off at the pad", "Take
  the rescue line off at the pad", "Slow down", "Lower N m" / "Higher N m",
  "Closer". Sound cue: reuse an existing short UI refusal sound from
  `tools/audio/catalog.json` and name it in the change note; no new recording.
- While a load is within 10 m sideways, show a ring on the ground under it that
  turns green when H would hook. Make the drawn hook easy to see (about 0.5 m).
- Applies to cars, lesson crates and rescue crates alike.
- First write a test that holds the helicopter at 18.5 m over a crate and at
  2 m/s and shows H fails today with no message; then passes, or gives the
  right message, after the fix.
- Lesson 4 (carry a crate) must still pass; lesson and cable tests whose
  numbers move are corrected and listed in the change note.

The ring and hook size are judged by eye: Claude checks one picture pair on the
laptop before merge. No new switch: this fixes the released helicopter.
