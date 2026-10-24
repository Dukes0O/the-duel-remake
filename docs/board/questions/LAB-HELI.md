# LAB-HELI: questions for Claude

Picked so the card can finish; say if any should change.

1. **The retardant needs one optional field in the saved fire record** (`heli-save.js`, not one of the card's five
   files). A fire is saved after every drop (`setFire` rebuilds the record field by field), so without a field the
   treated cells would be forgotten at once and "for the rest of that fire" could not hold. **Picked:** an optional
   `retardant: [[cell, litres]]` beside `burning`, `burnt` and `damp`, kept only once some has landed, never on a
   burning or burnt cell, capped at 80 cells like the others. A fire without it reads and saves exactly as before.
   This is a heli save-shape change; no other open card is known to touch the fire record.
2. **`heli-autopilot.js` reads the upgrades too** (one line, also outside the five files): its "highest height the
   helicopter can still hold a hover at" would otherwise ignore Engine 1/2 and the altitude tune and stop the
   autopilot climbing as high as the tuned helicopter can hold.
3. **What is not done here, by design:** the session offers the pad actions (`session.loadBucket('water'|'retardant')`,
   `session.chooseLine(15|25)`, `session.lab`) but draws nothing, and `src/app.js` is not changed, so the Lab's
   upgrades only act in the real game once the app passes `labEnabled: flags.enabled('lab')` to `createHeliSession`
   (one option; LAB-VIEW is the natural place). The fire view's litre bar divides by a fixed 600
   (`heli-fire-view.js`), so with the bigger bucket it would stop at three quarters; a one-word change to use the
   bucket's own `holds`, also left to LAB-VIEW. The retardant's sound (`heli.retardant`) is not made (LAB-RADIO):
   the bucket's `pourStart` and `pourStop` events carry `retardant: true` for it to play.
