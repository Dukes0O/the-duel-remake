# LAB-BRIAN-FIX

The short board entry controls current state, ownership, dependencies and locks.

Kyle tried the Lab 2 preview, 26 October 2026: "can't talk to brian. and his
eyes are a bit freaky." Picture: `.evidence/2026-10-26/kyle-preview/20.webp`
(integration folder).

## 1. Talking to Brian (LAB-WALK fault)

The floating sign above Brian always says "Brian · E to ask", but E only
reaches him within 1.3 m (`lab-walk-room.js`, `consider(... 'brian' ..., 1.3)`)
while he stands beside the weighing pad, whose machine prompt reaches 1.8 m
and is nearer, and his body may block the walker before 1.3 m. Claude's fix:
- the floating sign says only "Brian"; the floor prompt "E: ask Brian" is the
  one promise, and it appears whenever E will really reach him;
- Brian answers within 2.5 m, and when Brian and a machine are both in range,
  the one the player is facing wins;
- Brian stands a clear step to the side of the machine, never in its
  approach, and never inside the walker's collision.
Check: a test that walking up to Brian from the door shows "E: ask Brian" and
E opens his two questions, from the weighing pad and from two other machines;
the browser scenario presses E at Brian and reads his answer.

## 2. Brian's face (LAB-LIFT-2 art, round 3 of 3, the last)

Round 2's eyes are small pale whites with tiny pupils on a flat face, and the
beard is jagged patches, so he stares. Round 3: a warm, friendly teacher a
child likes at once.
- Eyes in proportion to the face, with a dark iris that fills most of the
  visible eye, upper eyelids and a soft eyelid shadow, so little white shows;
  a slight smile in the eyes (lower lids raised a touch).
- Brows and a gentle smile; a short, even beard or stubble with soft edges,
  not saw-tooth patches; face shading that gives cheeks and a nose some form.
- Same clothes, glasses and apron. Gritty and real, never toy-like, but kind.
- Judge it at the distance a player sees him (2 m, eye height) and close up.
Sheet: `docs/board/looks/lab-2/look-5.jpg` (at most 500 KB): Kyle's angle,
before and after, plus a 2 m view.

Switch `lab-2` (dev). Lane tier and build.

## 3. Lab 2 goes live (Kyle, 26 October 2026)

Kyle: preview changes "maybe they just need to be pushed into the real
game." Claude decides (rule 18): when 1 and 2 pass, switch `lab-2` on. The
walking Lab replaces the old glide camera; Lift and weight uses the new
five-step lesson; the other fifteen lessons open their current benches from
their machines until LAB-LESSONS-2 rebuilds them. Remove the old glide-camera
path in the same change (replace means remove), or name what still needs it.
Update the switch tests (each changed assertion explained), run the Lab,
save and hygiene suites and the full Lab browser flow with the switch on.
