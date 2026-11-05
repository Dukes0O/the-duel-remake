# CREW-STORY-JOIN

The short board entry controls current state, ownership, dependencies and locks.

A driver under rank 12 who finishes the Everburn is told Cinder joins, and the save records it, but `crewAdmitted` in `src/crew.js` and the check in `src/crew-ui.js` honour `crew.unlocked` only for Tusk, so she never appears (checked: `availableCrew` with no rank and `unlocked:['rook','cinder','jax','tusk']` gives only Rook and Tusk). Honour the unlock list for Cinder and Jax as well. Ranks, prices, the computer field and all other crew rules stay as they are.

**Files:** `src/crew.js`, `src/crew-ui.js`, `tools/test-crew-story-join.mjs`.

**Checks:** rank 1 with Cinder or Jax on the list has them available and pickable; rank 1 without them does not; a rank 12 driver is unchanged; the seeded computer field for a fixed seed is unchanged.

Design: `docs/WASTELAND_WORLD.md` section 5, `docs/story/iron-mule.md` section 2. One independent review (it touches who a save lets you pick). Run the card's checks and `npm run build`. Write `docs/changes/CREW-STORY-JOIN.md` with a Removed section. Memory-only saves.

## Claude answers
